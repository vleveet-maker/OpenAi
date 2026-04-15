import argparse
import logging
import os
import signal
import socket
import sys
import threading
import time

import paramiko


SCRIPT_COMPATIBILITY_VERSION = "phase37-reverse-tunnel-chat-smoke-v1"
LOCAL_HOST = "127.0.0.1"


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--remote-host", required=True)
    parser.add_argument("--remote-port", type=int, default=2222)
    parser.add_argument("--remote-user", required=True)
    parser.add_argument("--ssh-key-path", default="")
    parser.add_argument("--ssh-password", default="")
    parser.add_argument("--include-host-controller", action="store_true")
    parser.add_argument("--connect-attempts", type=int, default=6)
    parser.add_argument("--connect-retry-delay", type=int, default=5)
    return parser.parse_args()


def build_forwards(include_host_controller):
    forwards = [
        (14021, 4021),
        (14022, 4022),
        (14023, 4023),
        (14024, 4024),
        (14025, 4025),
        (14026, 4026),
        (14027, 4027),
    ]
    if include_host_controller:
        forwards.append((14040, 4040))
    return forwards


def resolve_password(args):
    if args.ssh_password:
        return args.ssh_password
    return os.environ.get("OWMCGP_REMOTE_SSH_PASSWORD", "")


def connect_with_retries(client, connect_kwargs, max_attempts, retry_delay_seconds):
    attempts = max(1, max_attempts)
    last_error = None

    for attempt in range(1, attempts + 1):
        try:
            client.connect(**connect_kwargs)
            return
        except Exception as exc:
            last_error = exc
            if attempt >= attempts:
                break

            sleep_for = min(30, max(1, retry_delay_seconds) * attempt)
            print(
                "[windows-block] reverse tunnel SSH connect attempt "
                f"{attempt}/{attempts} failed: {exc}; retrying in {sleep_for}s",
                file=sys.stderr,
                flush=True,
            )
            time.sleep(sleep_for)

    raise RuntimeError(
        f"SSH connect failed after {attempts} attempt(s): {last_error}"
    )


def socket_bridge(channel, local_port, stop_event):
    target = None
    try:
        target = socket.create_connection((LOCAL_HOST, local_port), timeout=10)
        channel.settimeout(1.0)
        target.settimeout(1.0)

        while not stop_event.is_set():
            try:
                data = channel.recv(65535)
                if data:
                    target.sendall(data)
                elif channel.closed:
                    break
            except socket.timeout:
                pass
            except Exception:
                break

            try:
                data = target.recv(65535)
                if data:
                    channel.sendall(data)
                else:
                    break
            except socket.timeout:
                pass
            except Exception:
                break

            if channel.closed:
                break
    finally:
        try:
            channel.close()
        except Exception:
            pass
        if target is not None:
            try:
                target.close()
            except Exception:
                pass


def main():
    args = parse_args()
    ssh_password = resolve_password(args)

    if not args.ssh_key_path and not ssh_password:
        raise RuntimeError(
            "Either --ssh-key-path, --ssh-password, or "
            "OWMCGP_REMOTE_SSH_PASSWORD is required."
        )

    logging.getLogger("paramiko").setLevel(logging.CRITICAL)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connect_kwargs = {
        "hostname": args.remote_host,
        "port": args.remote_port,
        "username": args.remote_user,
        "timeout": 30,
        "banner_timeout": 70,
        "auth_timeout": 30,
        "look_for_keys": False,
        "allow_agent": False,
    }

    if args.ssh_key_path:
        connect_kwargs["key_filename"] = args.ssh_key_path
    else:
        connect_kwargs["password"] = ssh_password

    stop_event = threading.Event()
    forward_specs = build_forwards(args.include_host_controller)
    forward_map = {remote_port: local_port for remote_port, local_port in forward_specs}
    transport = None

    def request_stop(_signum=None, _frame=None):
        stop_event.set()

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    try:
        connect_with_retries(
            client,
            connect_kwargs,
            args.connect_attempts,
            args.connect_retry_delay,
        )
        transport = client.get_transport()
        if transport is None or not transport.is_active():
            raise RuntimeError("SSH transport is not active.")

        transport.set_keepalive(30)

        def forward_handler(channel, _origin, server):
            local_port = forward_map.get(server[1])
            if local_port is None:
                try:
                    channel.close()
                except Exception:
                    pass
                return
            threading.Thread(
                target=socket_bridge,
                args=(channel, local_port, stop_event),
                daemon=True,
            ).start()

        for remote_port, local_port in forward_specs:
            transport.request_port_forward(
                LOCAL_HOST,
                remote_port,
                forward_handler,
            )

        forward_labels = ", ".join(
            f"{LOCAL_HOST}:{remote_port}->{LOCAL_HOST}:{local_port}"
            for remote_port, local_port in forward_specs
        )
        print(
            f"[windows-block] reverse tunnels running via paramiko ({SCRIPT_COMPATIBILITY_VERSION})",
            flush=True,
        )
        print(
            f"[windows-block] requested remote forwards: {forward_labels}",
            flush=True,
        )

        while not stop_event.is_set():
            if transport is None or not transport.is_active():
                raise RuntimeError("SSH transport stopped unexpectedly.")
            time.sleep(1)
    finally:
        if transport is not None:
            for remote_port, _local_port in forward_specs:
                try:
                    transport.cancel_port_forward(LOCAL_HOST, remote_port)
                except Exception:
                    pass
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
