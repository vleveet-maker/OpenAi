# MikroTik Public Ingress Hardening

This directory contains the deliberate RouterOS-side boundary for the remote relay.

Target path:

- public IP `tcp/80`
- `dst-nat`
- `192.168.88.2:80`
- server `nginx`
- relay on `127.0.0.1:4010`

Files:

- `owmcgp-public-ingress.rsc` - manual RouterOS command set

Notes:

- Do not expose raw `:4010` publicly.
- Keep router management services restricted to `192.168.88.0/24`.
- If automation is unavailable, the `.rsc` file is the exact sysadmin fallback.
