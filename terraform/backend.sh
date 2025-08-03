#!/bin/bash

set -euo pipefail

MODE="${1:-full}"  # Default to full if no argument is passed

# Logging
exec > >(tee -i /var/log/hirehacker-backend-setup.log)
exec 2>&1

if [[ "$MODE" == "pre" ]]; then
  echo "[PRE] Installing Docker and preparing for reboot..."
  sudo apt update -y
  sudo apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release postgresql-client-common postgresql-client

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

# Create database initialization script
echo "Creating database initialization script..."
cat > /app/init-db.sql << 'EOF'
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE hirehacker' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hirehacker');

-- Create user if it doesn't exist
DO $
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'hirehacker_user') THEN
        CREATE USER hirehacker_user WITH PASSWORD 'hirehacker_password';
    END IF;
END
$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hirehacker TO hirehacker_user;
ALTER DATABASE hirehacker OWNER TO hirehacker_user;

-- Connect to the hirehacker database and create tables
\c hirehacker;

-- Enable UUID extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create your specific submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    code TEXT NOT NULL,
    language VARCHAR(50),
    result TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions on tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hirehacker_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hirehacker_user;

-- Insert sample data for testing (optional)
INSERT INTO submissions (user_id, code, language, result) 
VALUES 
(uuid_generate_v4(), 'print("Hello World")', 'python', 'Hello World'),
(uuid_generate_v4(), 'console.log("Hello World");', 'javascript', 'Hello World'),
(uuid_generate_v4(), '#include<stdio.h>\nint main(){\nprintf("Hello World");\nreturn 0;\n}', 'c', 'Hello World')
ON CONFLICT DO NOTHING;

COMMIT;
EOF

echo "Creating database setup script..."
cat > /app/setup-database.sh << 'EOF'
#!/bin/bash

echo "Setting up PostgreSQL database..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until docker exec postgres-container pg_isready -U postgres; do
    echo "PostgreSQL is not ready yet... waiting"
    sleep 2
done

echo "PostgreSQL is ready! Setting up database..."

# Execute the database initialization script
docker exec -i postgres-container psql -U postgres < /app/init-db.sql

echo "Database setup completed!"

# Verify database creation
echo "Verifying database setup..."
docker exec postgres-container psql -U postgres -c "\l" | grep hirehacker || echo "Database verification failed"
docker exec postgres-container psql -U hirehacker_user -d hirehacker -c "\dt" || echo "Tables verification failed"
EOF

chmod +x /app/setup-database.sh

echo "Creating enhanced startup script..."
cat > /app/start-backend.sh << 'EOF'
#!/bin/bash
cd /app || { echo "App directory not found"; exit 1; }

echo "Starting backend services..."

# Start PostgreSQL first
echo "Starting PostgreSQL..."
docker compose up -d db standalone-postgres
sleep 15

# Setup database
echo "Setting up database..."
# Find the actual PostgreSQL container name
PG_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n1)
if [ -z "$PG_CONTAINER" ]; then
    echo "PostgreSQL container not found, trying with compose service name..."
    PG_CONTAINER="postgres"  # or whatever your service name is in docker-compose.yml
fi

# Update the setup script with actual container name
sed -i "s/postgres-container/$PG_CONTAINER/g" /app/setup-database.sh
/app/setup-database.sh

# Start Redis
echo "Starting Redis..."
docker compose up -d redis
sleep 5

# Start all other services
echo "Starting all services..."
docker compose up -d
sleep 10

echo "Services status:"
docker compose ps

echo "Database verification:"
docker exec $PG_CONTAINER psql -U postgres -c "\l" | grep hirehacker && echo "✓ Database created successfully" || echo "✗ Database creation failed"

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

echo "Creating enhanced health check script..."
cat > /app/health-check.sh << 'EOF'
#!/bin/bash
echo "=== Hirehacker Backend Health Check ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Database Health Check ==="
PG_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n1)
if [ -n "$PG_CONTAINER" ]; then
    echo "PostgreSQL Container: $PG_CONTAINER"
    docker exec "$PG_CONTAINER" pg_isready -U postgres && echo "✓ PostgreSQL is ready" || echo "✗ PostgreSQL not ready"
    
    # Check if hirehacker database exists
    if docker exec "$PG_CONTAINER" psql -U postgres -lqt | cut -d \| -f 1 | grep -qw hirehacker; then
        echo "✓ Hirehacker database exists"
        # Check tables
        TABLE_COUNT=$(docker exec "$PG_CONTAINER" psql -U hirehacker_user -d hirehacker -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        echo "✓ Tables in hirehacker database: $TABLE_COUNT"
    else
        echo "✗ Hirehacker database does not exist"
    fi
else
    echo "✗ PostgreSQL container not found"
fi

echo ""
echo "=== Redis Health Check ==="
REDIS_CONTAINER=$(docker ps --filter "ancestor=redis" --format "{{.Names}}" | head -n1)
[ -n "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping && echo "✓ Redis is ready" || echo "✗ Redis not ready"

echo ""
echo "=== API Health Check ==="
curl -s http://localhost:2358/about >/dev/null && echo "✓ Judge0 API is reachable" || echo "✗ Judge0 API not reachable"
curl -s http://localhost:8080/health >/dev/null && echo "✓ Backend API is reachable" || echo "✗ Backend API not reachable"
EOF

chmod +x /app/health-check.sh
chown ubuntu:ubuntu /app/health-check.sh

# Create database connection test script
cat > /app/test-db-connection.sh << 'EOF'
#!/bin/bash
echo "Testing database connection..."

PG_CONTAINER=$(docker ps --filter "ancestor=postgres" --format "{{.Names}}" | head -n1)

if [ -n "$PG_CONTAINER" ]; then
    echo "Testing connection as hirehacker_user..."
    docker exec "$PG_CONTAINER" psql -U hirehacker_user -d hirehacker -c "SELECT current_database(), current_user, version();"
    
    echo ""
    echo "Listing tables in hirehacker database..."
    docker exec "$PG_CONTAINER" psql -U hirehacker_user -d hirehacker -c "\dt"
    
    echo ""
    echo "Testing sample query..."
    docker exec "$PG_CONTAINER" psql -U hirehacker_user -d hirehacker -c "SELECT COUNT(*) as submission_count FROM submissions;"
else
    echo "PostgreSQL container not found!"
    exit 1
fi
EOF

chmod +x /app/test-db-connection.sh
chown ubuntu:ubuntu /app/test-db-connection.sh

echo "Starting backend services..."
systemctl start hirehacker-backend.service

echo "Waiting for services to stabilize..."
sleep 90

echo "Running health check..."
/app/health-check.sh

echo "Testing database connection..."
/app/test-db-connection.sh

echo "========================================="
echo "Hirehacker Backend Setup Completed!"
echo "- PostgreSQL: port 5432"
echo "- Redis: port 6379"
echo "- Judge0 API: port 2358"
echo "- Backend API: port 8080"
echo "- Database: hirehacker"
echo "- DB User: hirehacker_user"
echo "- DB Password: hirehacker_password"
echo "========================================="
echo ""
echo "Useful commands:"
echo "- Health check: /app/health-check.sh"
echo "- Test DB: /app/test-db-connection.sh"
echo "- View logs: docker compose logs"
echo "- Restart services: sudo systemctl restart hirehacker-backend"
echo "========================================="

docker --version
docker ps
systemctl status docker --no-pager -l
systemctl status hirehacker-backend --no-pager -l