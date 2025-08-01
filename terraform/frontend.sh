#!/bin/bash
# terraform/modules/instances/scripts/frontend.sh

set -euo pipefail

echo "========================================="
echo "Starting Hirehacker Frontend Setup Script"
echo "========================================="

# Update system packages
echo "Updating system packages..."
apt update -y

# Install Docker
echo "Installing Docker..."
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    gnupg \
    lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/trusted.gpg.d/docker.gpg
add-apt-repository \
   "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/trusted.gpg.d/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker service
echo "Starting Docker service..."
systemctl enable docker
systemctl start docker

# Add ec2-user to docker group
echo "Adding ec2-user to docker group..."
usermod -aG docker ec2-user

# Install Docker Compose (backward compatible symlink if needed)
ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true

# Install Git
echo "Installing Git..."
apt install -y git

# Install Node.js (LTS)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install additional utilities
echo "Installing additional utilities..."
apt install -y htop wget unzip nginx

# Create application directory
echo "Creating application directory..."
mkdir -p /app
chown ec2-user:ec2-user /app

# Create Docker Compose file for frontend
echo "Creating Docker Compose configuration..."
cat > /app/docker-compose.yml <<'EOF'
version: '3.8'
services:
  frontend:
    image: ${frontend_image}        # to be replaced by Terraform / deployment pipeline
    container_name: hirehacker-frontend
    ports:
      - "80:3000"
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://${BACKEND_PRIVATE_IP}:2358  # replace BACKEND_PRIVATE_IP
    restart: unless-stopped
    volumes:
      - /app/logs:/app/logs
    networks:
      - hirehacker-network

networks:
  hirehacker-network:
    driver: bridge
EOF

# Create a startup script
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

echo "Current status:"
docker compose ps
EOF

chmod +x /app/start-frontend.sh
chown ec2-user:ec2-user /app/start-frontend.sh

# Create systemd service for auto-start
echo "Creating systemd service..."
cat > /etc/systemd/system/hirehacker-frontend.service <<'EOF'
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
User=ec2-user
Group=docker

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hirehacker-frontend.service

# Create log directory
mkdir -p /app/logs
chown ec2-user:ec2-user /app/logs

# Configure nginx as reverse proxy
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/hirehacker <<'EOF'
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
EOF

ln -s /etc/nginx/sites-available/hirehacker /etc/nginx/sites-enabled/hirehacker
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
systemctl enable nginx

# Configure firewall if UFW is running
if systemctl is-active --quiet ufw; then
    echo "Configuring UFW firewall..."
    ufw allow http
    ufw allow https
    ufw allow 3000/tcp
    ufw reload
fi

# Start the application
echo "Starting the frontend application..."
cd /app
./start-frontend.sh

echo "========================================="
echo "Frontend Setup Completed Successfully!"
echo "Hirehacker frontend will be accessible on port 80"
echo "========================================="

# Display final status
echo "Docker status:"
docker --version
echo ""
echo "Running containers:"
docker ps
echo ""
echo "System status:"
systemctl status docker --no-pager -l
echo ""
echo "Frontend service status:"
systemctl status hirehacker-frontend --no-pager -l