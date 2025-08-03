#!/bin/bash

set -euo pipefail

MODE="${1:-full}"  # Default to full if no argument is passed

# Logging
exec > >(tee -i /var/log/hirehacker-backend-setup.log)
exec 2>&1

if [[ "$MODE" == "pre" ]]; then
  echo "[PRE] Installing Docker and preparing for reboot..."
  sudo apt update -y
  sudo apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

  install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

  sudo apt update -y
  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin docker-compose

  sudo usermod -aG docker ubuntu

  echo "Configuring GRUB for cgroup v1"
  sudo sed -i 's/^GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0 /' /etc/default/grub
  sudo update-grub

  echo "Rebooting required. Terraform will handle it."
  exit 0
fi

# --- Full Setup Starts Here ---
echo "[FULL] Starting Hirehacker Backend Setup (Post-Reboot)"

mkdir -p /app
cd /app

echo "Cloning Judge0 repo..."
git clone --depth=1 --branch backend https://github.com/samalsubrat/hirehacker.git
mv hirehacker/backend/* ./
rm -rf hirehacker

echo "Creating startup script..."
cat > /app/start-backend.sh << 'EOF'
#!/bin/bash
cd /app || { echo "Judge0 directory not found"; exit 1; }

echo "Starting backend services..."
docker compose up -d db standalone-postgres redis
sleep 10s
docker compose up -d
sleep 5s

docker compose ps
echo "All backend services started successfully!"
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

echo "Creating post-reboot service..."
cat <<'EOF' | sudo tee /etc/systemd/system/hirehacker-backend-post.service
[Unit]
Description=Hirehacker Backend Post-Reboot Provisioning
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/bash /home/ubuntu/backend.sh full
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable hirehacker-backend-post.service

echo "Creating health check script..."
cat > /app/health-check.sh << 'EOF'
#!/bin/bash
echo "=== Hirehacker Backend Health Check ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

PG_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n1)
[ -n "$PG_CONTAINER" ] && docker exec "$PG_CONTAINER" pg_isready -U postgres || echo "PostgreSQL not ready"

REDIS_CONTAINER=$(docker ps --filter "ancestor=redis" --format "{{.Names}}" | head -n1)
[ -n "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping || echo "Redis not ready"

curl -s http://localhost:2358/about || echo "Judge0 API not reachable"
EOF

chmod +x /app/health-check.sh
chown ubuntu:ubuntu /app/health-check.sh

echo "Starting backend services..."
systemctl start hirehacker-backend.service

echo "Waiting for services to stabilize..."
sleep 60
/app/health-check.sh

echo "========================================="
echo "Hirehacker Backend Setup Completed!"
echo "- PostgreSQL: port 5432"
echo "- Redis: port 6379"
echo "- Judge0 API: port 2358"
echo "- Backend API: port 8000"
echo "========================================="

docker --version
docker ps
systemctl status docker --no-pager -l
systemctl status hirehacker-backend --no-pager -l
