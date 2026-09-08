#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time bootstrap for a fresh Oracle Cloud compute instance.
# Run it ON THE VM, as the default user (ubuntu / opc), not as root:
#
#     bash deploy/setup-oracle.sh
#
# Installs Docker, adds swap, and — the step everyone loses a day to — opens
# ports 80/443 in the *instance's own* firewall. OCI images ship with a host
# firewall that drops everything except SSH, so opening the VCN security list
# alone leaves the site unreachable with no error message anywhere.
# ---------------------------------------------------------------------------
set -euo pipefail

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$1"; }

if [[ $EUID -eq 0 ]]; then
  warn "Run as the default user (ubuntu/opc), not root."
  exit 1
fi

# --- Distro detection ------------------------------------------------------
. /etc/os-release
log "Detected $PRETTY_NAME on $(uname -m)"

case "$ID" in
  ubuntu|debian) PKG=apt ;;
  ol|oracle|rhel|almalinux|rocky) PKG=dnf ;;
  *) warn "Unrecognised distro '$ID' — install Docker manually, then re-run."; exit 1 ;;
esac

# --- Swap ------------------------------------------------------------------
# The Vite/tsc build is the memory spike in this stack. On the 1 GB AMD micro
# shape it OOM-kills without swap; on the 24 GB Ampere shape this costs nothing
# and still protects against a runaway.
if ! swapon --show | grep -q .; then
  log "Creating 2G swapfile"
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  log "Swap already present — skipping"
fi

# --- Docker ----------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  log "Docker already installed ($(docker --version))"
else
  log "Installing Docker Engine + Compose plugin"
  if [[ $PKG == apt ]]; then
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg git
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/$ID/gpg" \
      | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/$ID $VERSION_CODENAME stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
      docker-buildx-plugin docker-compose-plugin
  else
    sudo dnf install -y dnf-utils git
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    # Oracle Linux ships podman's runc shim under the same names; allow the swap.
    sudo dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io \
      docker-buildx-plugin docker-compose-plugin
  fi
  sudo systemctl enable --now docker
fi

log "Adding $USER to the docker group"
sudo usermod -aG docker "$USER"

# --- Host firewall ---------------------------------------------------------
# THIS is the OCI-specific trap. The VCN security list is only half the story;
# the instance drops 80/443 locally until these rules exist and are persisted.
log "Opening ports 80 and 443 in the host firewall"
if command -v firewall-cmd >/dev/null 2>&1 && sudo systemctl is-active --quiet firewalld; then
  sudo firewall-cmd --permanent --add-service=http
  sudo firewall-cmd --permanent --add-service=https
  sudo firewall-cmd --reload
  echo "   firewalld rules added and persisted."
else
  # OCI's Ubuntu images carry a stock iptables ruleset whose final rule REJECTs
  # everything, so the new ACCEPTs must be *inserted* above it, not appended.
  for port in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
      || sudo iptables -I INPUT 6 -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
  done
  # HTTP/3.
  sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT 6 -p udp --dport 443 -m conntrack --ctstate NEW -j ACCEPT

  if [[ $PKG == apt ]]; then
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent netfilter-persistent
    sudo netfilter-persistent save
  else
    sudo sh -c 'iptables-save > /etc/iptables/rules.v4' 2>/dev/null || \
      warn "Could not persist iptables rules — they will be lost on reboot. Save them manually."
  fi
  echo "   iptables rules inserted and saved."
fi

log "Done."
cat <<'NEXT'

Next:
  1. Log out and back in (or run `newgrp docker`) so the docker group applies.
  2. Open ingress for TCP 80 and 443 in the VCN security list — the OCI console
     half of the firewall. See deploy/README.md, step 3.
  3. Clone the repo, fill in the three .env files, then run deploy/deploy.sh.

NEXT
