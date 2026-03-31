[CmdletBinding()]
param(
  [string]$HostName = "77.66.186.75",
  [int]$Port = 2222,
  [string]$User = "mi50",
  [string]$Password = "",
  [string]$RemoteConfigPath = "/etc/nginx/sites-available/owmcgp-remote-relay.conf",
  [string]$RemoteEnabledPath = "/etc/nginx/sites-enabled/owmcgp-remote-relay.conf",
  [string]$RemoteEnvPath = "/etc/owmcgp/remote-relay.env",
  [string]$ServiceName = "owmcgp-remote-relay",
  [string]$ServerName = "_"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = [Environment]::GetEnvironmentVariable("OWMCGP_REMOTE_SSH_PASSWORD")
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  throw "Password is required. Pass -Password or set OWMCGP_REMOTE_SSH_PASSWORD."
}

$templatePath = Join-Path $PSScriptRoot "nginx\\owmcgp-remote-relay.conf"
$configText = (Get-Content $templatePath -Raw).Replace("__SERVER_NAME__", $ServerName)

$env:OWMCGP_REMOTE_EDGE_HOST = $HostName
$env:OWMCGP_REMOTE_EDGE_PORT = "$Port"
$env:OWMCGP_REMOTE_EDGE_USER = $User
$env:OWMCGP_REMOTE_EDGE_PASSWORD = $Password
$env:OWMCGP_REMOTE_EDGE_CONFIG_PATH = $RemoteConfigPath
$env:OWMCGP_REMOTE_EDGE_ENABLED_PATH = $RemoteEnabledPath
$env:OWMCGP_REMOTE_EDGE_ENV_PATH = $RemoteEnvPath
$env:OWMCGP_REMOTE_EDGE_SERVICE = $ServiceName
$env:OWMCGP_REMOTE_EDGE_CONFIG = $configText

@'
import os
import paramiko

host = os.environ["OWMCGP_REMOTE_EDGE_HOST"]
port = int(os.environ["OWMCGP_REMOTE_EDGE_PORT"])
user = os.environ["OWMCGP_REMOTE_EDGE_USER"]
password = os.environ["OWMCGP_REMOTE_EDGE_PASSWORD"]
config_path = os.environ["OWMCGP_REMOTE_EDGE_CONFIG_PATH"]
enabled_path = os.environ["OWMCGP_REMOTE_EDGE_ENABLED_PATH"]
env_path = os.environ["OWMCGP_REMOTE_EDGE_ENV_PATH"]
service = os.environ["OWMCGP_REMOTE_EDGE_SERVICE"]
config_text = os.environ["OWMCGP_REMOTE_EDGE_CONFIG"]

def run(client, command, timeout=120):
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        raise RuntimeError(f"{command}\\nSTDOUT:\\n{out}\\nSTDERR:\\n{err}")
    return out.strip()

sudo_prefix = "echo '{0}' | sudo -S -p '' ".format(password.replace("'", "'\"'\"'"))
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=15)
sftp = client.open_sftp()

try:
    try:
        run(client, "nginx -v", timeout=30)
    except Exception:
        run(client, sudo_prefix + "apt-get update", timeout=300)
        run(client, sudo_prefix + "DEBIAN_FRONTEND=noninteractive apt-get install -y nginx", timeout=300)

    tmp_config = "/tmp/owmcgp-remote-relay.conf"
    with sftp.open(tmp_config, "w") as handle:
        handle.write(config_text)

    run(client, sudo_prefix + f"mv {tmp_config} {config_path}")
    run(client, sudo_prefix + f"chmod 644 {config_path}")
    run(client, sudo_prefix + f"ln -sf {config_path} {enabled_path}")
    run(client, sudo_prefix + "rm -f /etc/nginx/sites-enabled/default || true")

    run(
        client,
        sudo_prefix
        + f"sed -i 's/^CONTROL_API_HOST=.*/CONTROL_API_HOST=127.0.0.1/' {env_path}"
    )

    run(client, sudo_prefix + "nginx -t")
    run(client, sudo_prefix + "systemctl daemon-reload")
    run(client, sudo_prefix + "systemctl enable --now nginx")
    run(client, sudo_prefix + f"systemctl restart {service}")
    run(client, sudo_prefix + "systemctl reload nginx")
finally:
    sftp.close()
    client.close()
'@ | python -

if ($LASTEXITCODE -ne 0) {
  throw "deploy-public-ingress Python helper failed."
}

Write-Host "Public ingress deployed on $HostName via nginx."
Write-Host "Relay process host binding forced to 127.0.0.1 in $RemoteEnvPath."
