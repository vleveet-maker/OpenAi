# OWMCGP deliberate public ingress for remote relay
# Apply only after reviewing current RouterOS state.

/ip firewall nat
add chain=dstnat action=dst-nat protocol=tcp in-interface-list=WAN dst-port=80 to-addresses=192.168.88.2 to-ports=80 comment="owmcgp-public-relay-http"

/ip service
set [find name=ftp] address=192.168.88.0/24
set [find name=telnet] address=192.168.88.0/24
set [find name=ssh] address=192.168.88.0/24
set [find name=www] address=192.168.88.0/24
set [find name=winbox] address=192.168.88.0/24
set [find name=api] address=192.168.88.0/24
set [find name=api-ssl] address=192.168.88.0/24
