#!/bin/bash
# terraform/modules/instances/scripts/frontend.sh

set -euo pipefail

echo "========================================="
echo "Starting Hirehacker Frontend Setup Script"
echo "========================================="

exec > >(tee -i /var/log/hirehacker-frontend-setup.log)
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

# Create application directory
echo "Creating application directory..."
mkdir -p /app
chown ubuntu:ubuntu /app

echo "Cloning Judge0 repo..."
git clone --depth=1 --branch backend https://github.com/samalsubrat/hirehacker.git
mv hirehacker/backend/* ./
rm -rf hirehacker

echo "Creating startup script..."
cat > /app/start-backend.sh << 'EOF'
#!/bin/bash
cd /app || { echo "Judge0 directory not found"; exit 1; }

echo "Starting backend services..."
docker compose up -d db redis
sleep 10s
docker compose up -d
sleep 5s

docker compose ps
echo "All backend services started successfully!"
EOF

# Get backend IP from environment variable (passed from Terraform)
BACKEND_PRIVATE_IP=${BACKEND_PRIVATE_IP:-"localhost"}
echo "Using backend IP: $BACKEND_PRIVATE_IP"

# Create Docker Compose file for frontend
echo "Creating Docker Compose configuration..."
cat > /app/docker-compose.yml <<EOF
version: '3.8'
services:
  frontend:
    image: samalsubrat/hirehacker-frontend:v2
    container_name: hirehacker-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${BACKEND_PRIVATE_IP}:2358
      - NEXT_PUBLIC_BACKEND_URL=${BACKEND_PRIVATE_IP}:8000
      - JUDGE0_API_URL=${BACKEND_PRIVATE_IP}:2358
      - DB_USER=postgres
      - DB_HOST=${BACKEND_PRIVATE_IP}
      - DB_NAME=postgres
      - DB_PASSWORD=postgres
      - DB_PORT=5432
    restart: unless-stopped
    volumes:
      - /app/logs:/app/logs
    networks:
      - hirehacker-network

networks:
  hirehacker-network:
    driver: bridge
EOF

# Create startup script
echo "Creating startup script..."
cat > /app/start-frontend.sh <<'EOF'
#!/bin/bash
cd /app

echo "Pulling latest image..."
docker compose pull

echo "Stopping any existing instance..."
docker compose down

echo "Starting Hirehacker frontend..."
docker compose up -d

echo "Waiting for frontend to start..."
sleep 15

echo "Current status:"
docker compose ps

# Health check
echo "Performing health check..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "Frontend is responding on port 3000"
else
    echo "Frontend may not be ready yet, check docker logs"
fi
EOF

chmod +x /app/start-frontend.sh
chown ubuntu:ubuntu /app/start-frontend.sh

# Create systemd service for auto-start
echo "Creating systemd service..."
cat > /etc/systemd/system/hirehacker-frontend.service <<EOF
[Unit]
Description=Hirehacker Frontend Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
ExecStart=/usr/bin/docker compose -f /app/docker-compose.yml up -d
ExecStop=/usr/bin/docker compose -f /app/docker-compose.yml down
WorkingDirectory=/app
User=ubuntu
Group=docker

[Install]
WantedBy=multi-user.target


EOF

systemctl daemon-reload
systemctl enable hirehacker-frontend.service
sudo systemctl start hirehacker-frontend.service


# Create log directory
mkdir -p /app/logs
chown ubuntu:ubuntu /app/logs

# Configure nginx as reverse proxy
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/hirehacker <<EOF
server {
    listen 80;
    server_name _;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hirehacker /etc/nginx/sites-enabled/hirehacker
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

systemctl restart nginx
systemctl enable nginx

# Configure firewall if UFW is running
if systemctl is-active --quiet ufw; then
    echo "Configuring UFW firewall..."
    ufw allow http
    ufw allow https
    ufw allow 3000/tcp
    ufw allow ssh
    ufw --force enable
fi

# Start the application
echo "Starting the frontend application..."
cd /app
sudo -u ubuntu ./start-frontend.sh

# Wait for application to start
sleep 30

echo "========================================="
echo "Frontend Setup Completed Successfully!"
echo "Hirehacker frontend will be accessible on port 80"
echo "Direct access available on port 3000"
echo "Backend configured to connect to: $BACKEND_PRIVATE_IP"
echo "========================================="

# Display final status
echo "Docker version:"
docker --version
echo ""
echo "Running containers:"
docker ps
echo ""
echo "Nginx status:"
systemctl status nginx --no-pager -l
echo ""
echo "Frontend service status:"
systemctl status hirehacker-frontend --no-pager -l
echo ""
echo "Application health check:"
curl -f http://localhost/health && echo " - Nginx is responding"
curl -f http://localhost:3000 && echo " - Frontend app is responding" || echo " - Frontend app may still be starting"