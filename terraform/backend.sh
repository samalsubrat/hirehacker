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

  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

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
mv hirehacker/backend/judge0-v1.13.1 ./
rm -rf hirehacker

echo "Creating startup script..."
cat > /app/start-backend.sh << 'EOF'
#!/bin/bash
cd /app/judge0-v1.13.1 || { echo "Judge0 directory not found"; exit 1; }

echo "Starting backend services..."
docker compose up -d db redis
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
ExecStop=/usr/bin/docker compose -f /app/docker-compose.yml down
WorkingDirectory=/app
User=ubuntu
Group=docker

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hirehacker-backend.service

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
curl -s http://localhost:8000/health || echo "Backend API not reachable"
EOF

chmod +x /app/health-check.sh
chown ubuntu:ubuntu /app/health-check.sh

echo "Starting backend services..."
/app/start-backend.sh

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
