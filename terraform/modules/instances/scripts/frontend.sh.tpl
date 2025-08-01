#!/bin/bash
set -euo pipefail

echo "========================================="
echo "Starting Hirehacker Frontend Setup Script"
echo "========================================="

apt update -y

apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/trusted.gpg.d/docker.gpg
add-apt-repository "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/trusted.gpg.d/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

usermod -aG docker ubuntu

ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

apt install -y git

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

apt install -y htop wget unzip nginx

mkdir -p /app
chown ubuntu:ubuntu /app

cat > /app/docker-compose.yml <<EOF
version: '3.8'
services:
  frontend:
    image: ${frontend_image}
    container_name: hirehacker-frontend
    ports:
      - "80:3000"
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://${backend_ip}:2358
    restart: unless-stopped
    volumes:
      - /app/logs:/app/logs
    networks:
      - hirehacker-network

networks:
  hirehacker-network:
    driver: bridge
EOF

cat > /app/start-frontend.sh <<'EOT'
#!/bin/bash
cd /app

echo "Pulling latest image..."
docker compose pull

echo "Stopping any existing instance..."
docker compose down

echo "Starting Hirehacker frontend..."
docker compose up -d

echo "Current status:"
docker compose ps
EOT

chmod +x /app/start-frontend.sh
chown ubuntu:ubuntu /app/start-frontend.sh

cat > /etc/systemd/system/hirehacker-frontend.service <<'EOT'
[Unit]
Description=Hirehacker Frontend Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/app/start-frontend.sh
ExecStop=/usr/bin/docker compose -f /app/docker-compose.yml down
WorkingDirectory=/app
User=ubuntu
Group=docker

[Install]
WantedBy=multi-user.target
EOT

systemctl daemon-reload
systemctl enable hirehacker-frontend.service

mkdir -p /app/logs
chown ubuntu:ubuntu /app/logs

cat > /etc/nginx/sites-available/hirehacker <<'EOT'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOT

ln -s /etc/nginx/sites-available/hirehacker /etc/nginx/sites-enabled/hirehacker
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
systemctl enable nginx

if systemctl is-active --quiet ufw; then
  ufw allow http
  ufw allow https
  ufw allow 3000/tcp
  ufw reload
fi

cd /app
./start-frontend.sh

echo "========================================="
echo "Frontend Setup Completed Successfully!"
echo "Hirehacker frontend will be accessible on port 80"
echo "========================================="

docker --version
docker ps
systemctl status docker --no-pager -l
systemctl status hirehacker-frontend --no-pager -l
