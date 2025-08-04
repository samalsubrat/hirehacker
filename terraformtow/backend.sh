#!/bin/bash

set -euo pipefail

MODE="${1:-full}"

exec > >(tee -i /var/log/hirehacker-backend-setup.log)
exec 2>&1

if [[ "$MODE" == "pre" ]]; then
  echo "[PRE] Installing Docker and preparing for reboot..."
  sudo apt update -y
  sudo apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg]     https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable"     > /etc/apt/sources.list.d/docker.list

  sudo apt update -y
  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

  sudo usermod -aG docker ubuntu

  echo "Configuring GRUB for cgroup v1"
  sudo sed -i 's/^GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0 /' /etc/default/grub
  sudo update-grub

  echo "Rebooting required. Terraform will handle it."
  exit 0
fi

echo "[FULL] Starting Hirehacker Backend Setup (Post-Reboot)"

mkdir -p /app
cd /app

echo "Cloning HireHacker backend repo..."
git clone --depth=1 --branch backend https://github.com/samalsubrat/hirehacker.git
mv hirehacker/backend/* ./
rm -rf hirehacker

echo "Creating backend startup script..."
cat > /app/start-backend.sh << 'EOF'
#!/bin/bash
cd /app || { echo "Backend directory not found"; exit 1; }
docker compose up -d db redis
EOF

chmod +x /app/start-backend.sh
chown ubuntu:ubuntu /app/start-backend.sh

echo "Creating systemd service..."
cat > /etc/systemd/system/hirehacker-backend.service << 'EOF'
[Unit]
Description=Hirehacker Backend Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/app/start-backend.sh
ExecStop=/bin/bash -c 'cd /app && docker compose down'
WorkingDirectory=/app
User=ubuntu
Group=docker

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hirehacker-backend.service
systemctl start hirehacker-backend.service

echo "Backend setup complete."
