#!/bin/bash

set -euo pipefail

# Optional logging to file
exec > >(tee -i /var/log/hirehacker-backend-setup.log)
exec 2>&1

echo "Starting Hirehacker Backend Setup Script"

echo "Updating packages and installing Docker"
sudo apt update -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release

# Install Docker Engine
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update -y
sudo apt install -y docker-ce docker-ce-cli containerd.io docker docker-compose-plugin docker-compose

# Add ec2-user to docker group (requires re-login to take effect)
sudo usermod -aG docker ec2-user

# Create /app directory if it doesn't exist
mkdir -p /app
cd /app

echo "Creating Submissions database initialization SQL script"
cat > ./init-submissions-db.sql << 'EOF'
CREATE USER submissions_user WITH PASSWORD 'YourSecurePassword123';
CREATE DATABASE submissions OWNER submissions_user;
GRANT ALL PRIVILEGES ON DATABASE submissions TO submissions_user;
EOF

# Create startup script
echo "Creating startup script..."
cat > /app/start-backend.sh << 'EOF'
#!/bin/bash
cd /app

echo "Starting backend services..."

cd judge0-v1.13.1 || { echo "Judge0 directory not found"; exit 1; }

docker compose up -d db redis
sleep 10s
docker compose up -d
sleep 5s

# Show status
docker compose ps

echo "All backend services started successfully!"
EOF

chmod +x /app/start-backend.sh
chown ec2-user:ec2-user /app/start-backend.sh

# Create systemd service for auto-start
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
User=ec2-user
Group=docker

[Install]
WantedBy=multi-user.target
EOF

# Enable and reload systemd
systemctl daemon-reload
systemctl enable hirehacker-backend.service

# Create health check script
echo "Creating health check script..."
cat > /app/health-check.sh << 'EOF'
#!/bin/bash
echo "=== Hirehacker Backend Health Check ==="

echo "Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "PostgreSQL status:"
PG_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n1)
[ -n "$PG_CONTAINER" ] && docker exec "$PG_CONTAINER" pg_isready -U postgres || echo "PostgreSQL container not found or not ready"
echo ""

echo "Redis status:"
REDIS_CONTAINER=$(docker ps --filter "ancestor=redis" --format "{{.Names}}" | head -n1)
[ -n "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping || echo "Redis container not found or not ready"
echo ""

echo "Judge0 API status:"
curl -s http://localhost:2358/about || echo "Judge0 API not reachable"
echo ""

echo "Backend API status:"
curl -s http://localhost:8000/health || echo "Backend API not reachable"
echo ""
EOF

chmod +x /app/health-check.sh
chown ec2-user:ec2-user /app/health-check.sh

# Configure firewall if running
if systemctl is-active --quiet firewalld; then
    echo "Configuring firewall..."
    firewall-cmd --permanent --add-port=5432/tcp
    firewall-cmd --permanent --add-port=6379/tcp
    firewall-cmd --permanent --add-port=2358/tcp
    firewall-cmd --permanent --add-port=8000/tcp
    firewall-cmd --reload
fi

# Start the backend services
echo "Starting backend services..."
/app/start-backend.sh

# Wait and run health check
sleep 60
/app/health-check.sh

echo "========================================="
echo "Hirehacker Backend Setup Completed!"
echo "Services available:"
echo "- PostgreSQL: port 5432"
echo "- Redis: port 6379"
echo "- Judge0 API: port 2358"
echo "- Backend API: port 8000"
echo "========================================="

# Final status
docker --version
echo ""
docker ps
echo ""
systemctl status docker --no-pager -l
echo ""
systemctl status hirehacker-backend --no-pager -l