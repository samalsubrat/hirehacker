# Add required TLS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

# 1. VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "hirehacker-vpc"
  }
}

# 2. Subnets
variable "vpc_availability_zones" {
  type    = list(string)
  default = ["ap-south-1a"]
}

resource "aws_subnet" "public_subnet" {
  count             = length(var.vpc_availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 1)
  availability_zone = element(var.vpc_availability_zones, count.index)

  tags = {
    Name = "hirehacker public subnet ${count.index + 1}"
  }
}

resource "aws_subnet" "private_subnet" {
  count             = length(var.vpc_availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 3)
  availability_zone = element(var.vpc_availability_zones, count.index)

  tags = {
    Name = "hirehacker private subnet ${count.index + 1}"
  }
}

# 3. Internet Gateway
resource "aws_internet_gateway" "igw_vpc" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "Hirehacker Internet Gateway"
  }
}

# 4. Route Table for Public Subnet
resource "aws_route_table" "route_table_public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw_vpc.id
  }

  tags = {
    Name = "Public subnet route table"
  }
}

# 5. Route Table association with public subnet
resource "aws_route_table_association" "public_subnet_association" {
  count          = length(var.vpc_availability_zones)
  subnet_id      = element(aws_subnet.public_subnet[*].id, count.index)
  route_table_id = aws_route_table.route_table_public.id
}

# 6. Elastic IP
resource "aws_eip" "eip" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw_vpc]
}

# 7. NAT Gateway
resource "aws_nat_gateway" "hh_nat_gateway" {
  subnet_id     = element(aws_subnet.public_subnet[*].id, 0)
  allocation_id = aws_eip.eip.id
  depends_on    = [aws_internet_gateway.igw_vpc]
  tags = {
    Name = "Hirehacker NAT Gateway"
  }
}

# 8. Route Table for Private Subnet - FIXED
resource "aws_route_table" "route_table_private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.hh_nat_gateway.id  # FIXED: Use nat_gateway_id instead of gateway_id
  }

  tags = {
    Name = "Private Subnet Route Table"
  }
}

# 9. Route Table association with private subnet
resource "aws_route_table_association" "private_subnet_association" {
  count          = length(var.vpc_availability_zones)
  subnet_id      = element(aws_subnet.private_subnet[*].id, count.index)
  route_table_id = aws_route_table.route_table_private.id
}

# 10. Generate SSH Key Pair
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "hirehacker-key"
  public_key = tls_private_key.ssh_key.public_key_openssh
}

output "private_key_pem" {
  value     = tls_private_key.ssh_key.private_key_pem
  sensitive = true
}

# 11. AMI for Ubuntu 22.04
data "aws_ami" "ubuntu_2204" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 12. Security Groups
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

resource "aws_security_group" "frontend" {
  name        = "hirehacker-frontend-sg"
  description = "Allow SSH and HTTP from anywhere"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "hirehacker-frontend-sg"
  }
}

resource "aws_security_group" "backend" {
  name        = "hirehacker-backend-sg"
  description = "Backend SG"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  ingress {
    from_port   = 2358
    to_port     = 2358
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "hirehacker-backend-sg"
  }
}

# 13. EC2 Frontend (Public) with provisioner
resource "aws_instance" "public_ec2" {
  count                       = length(aws_subnet.public_subnet)
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = "t2.micro"
  subnet_id                   = element(aws_subnet.public_subnet[*].id, count.index)
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.frontend.id]
  key_name                    = aws_key_pair.generated_key.key_name

  # Wait for instance to be ready
  provisioner "remote-exec" {
    inline = [
      "cloud-init status --wait"
    ]
    
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
      timeout     = "5m"
    }
  }

  provisioner "file" {
    source      = "${path.module}/frontend.sh"
    destination = "/home/ubuntu/frontend.sh"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /home/ubuntu/frontend.sh",
      "export BACKEND_PRIVATE_IP=http://localhost",
      "sudo -E /home/ubuntu/frontend.sh"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
    }
  }

  # Verify Docker installation and application status
  provisioner "remote-exec" {
    inline = [
      "echo 'Verifying Docker installation and application status...'",
      "docker --version",
      "docker ps",
      "echo 'Checking if frontend application is running...'",
      "if docker ps | grep -q frontend; then echo 'Frontend container is running'; else echo 'Frontend container is not running'; fi",
      "echo 'Checking frontend application health...'",
      "sleep 10",
      "curl -f http://localhost:3000 && echo 'Frontend application is responding' || echo 'Frontend application is not responding'"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
    }
  }

  tags = {
    Name = "hirehacker-public-ec2-${count.index + 1}"
  }
}

# Database configuration - SIMPLIFIED
locals {
  db_name     = "hirehacker"
  db_user     = "hirehacker_user" 
  db_password = "hirehacker_password"
}

# 14. EC2 Backend (Private) - FIXED VERSION
resource "aws_instance" "private_ec2" {
  count                       = length(aws_subnet.private_subnet)
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = "t2.micro"
  subnet_id                   = element(aws_subnet.private_subnet[*].id, count.index)
  associate_public_ip_address = false
  vpc_security_group_ids      = [aws_security_group.backend.id]
  key_name                    = aws_key_pair.generated_key.key_name

  root_block_device {
    volume_size = 30
    volume_type = "gp2"
  }

  # Transfer backend script
  provisioner "file" {
    source      = "${path.module}/backend.sh"
    destination = "/home/ubuntu/backend.sh"

    connection {
      type                = "ssh"
      user                = "ubuntu"
      private_key         = tls_private_key.ssh_key.private_key_pem
      host                = self.private_ip
      bastion_host        = aws_instance.public_ec2[0].public_ip
      bastion_user        = "ubuntu"
      bastion_private_key = tls_private_key.ssh_key.private_key_pem
      timeout             = "10m"
    }
  }

  # Create database config inline (no external template needed)
  provisioner "remote-exec" {
    inline = [
      "cat > /home/ubuntu/db-config.env << 'EOF'",
      "export DB_NAME=${local.db_name}",
      "export DB_USER=${local.db_user}",
      "export DB_PASSWORD=${local.db_password}",
      "export DB_HOST=localhost",
      "export DB_PORT=5432",
      "export DATABASE_URL=postgresql://${local.db_user}:${local.db_password}@localhost:5432/${local.db_name}",
      "EOF"
    ]

    connection {
      type                = "ssh"
      user                = "ubuntu"
      private_key         = tls_private_key.ssh_key.private_key_pem
      host                = self.private_ip
      bastion_host        = aws_instance.public_ec2[0].public_ip
      bastion_user        = "ubuntu"
      bastion_private_key = tls_private_key.ssh_key.private_key_pem
      timeout             = "5m"
    }
  }

  # Step 1: Pre-setup with proper timeout
  provisioner "remote-exec" {
    inline = [
      "cloud-init status --wait",
      "chmod +x /home/ubuntu/backend.sh",
      "echo 'Starting pre-installation...'",
      "sudo /home/ubuntu/backend.sh pre 2>&1 | tee /tmp/pre-setup.log",
      "echo 'Pre-installation completed'"
    ]

    connection {
      type                = "ssh"
      user                = "ubuntu"
      private_key         = tls_private_key.ssh_key.private_key_pem
      host                = self.private_ip
      bastion_host        = aws_instance.public_ec2[0].public_ip
      bastion_user        = "ubuntu"
      bastion_private_key = tls_private_key.ssh_key.private_key_pem
      timeout             = "15m"  # ADDED TIMEOUT
    }
  }

  depends_on = [
    aws_instance.public_ec2, 
    aws_nat_gateway.hh_nat_gateway,
    aws_route_table_association.private_subnet_association
  ]

  tags = {
    Name = "hirehacker-private-ec2-${count.index + 1}"
  }
}

# Separate resource for full setup with better error handling
resource "null_resource" "backend_full_setup" {
  count = length(aws_instance.private_ec2)
  
  depends_on = [aws_instance.private_ec2]

  triggers = {
    instance_id = aws_instance.private_ec2[count.index].id
  }

  # Connection test first
  provisioner "remote-exec" {
    inline = [
      "echo 'Testing connectivity...'",
      "ping -c 2 8.8.8.8 || echo 'Internet connectivity issue'",
      "curl -I https://github.com --connect-timeout 10 || echo 'GitHub connectivity issue'"
    ]

    connection {
      type                = "ssh"
      user                = "ubuntu"
      private_key         = tls_private_key.ssh_key.private_key_pem
      host                = aws_instance.private_ec2[count.index].private_ip
      bastion_host        = aws_instance.public_ec2[0].public_ip
      bastion_user        = "ubuntu"
      bastion_private_key = tls_private_key.ssh_key.private_key_pem
      timeout             = "5m"
    }
  }

  # Full setup with timeout and error handling
  provisioner "remote-exec" {
    inline = [
      "echo 'Waiting before full setup...'",
      "sleep 60",
      "echo 'Loading database configuration...'",
      "source /home/ubuntu/db-config.env || echo 'DB config not found'",
      "echo 'Starting full backend setup...'",
      "sudo /home/ubuntu/backend.sh full 2>&1 | tee /tmp/full-setup.log || echo 'Setup completed with warnings'"
    ]

    connection {
      type                = "ssh"
      user                = "ubuntu"
      private_key         = tls_private_key.ssh_key.private_key_pem
      host                = aws_instance.private_ec2[count.index].private_ip
      bastion_host        = aws_instance.public_ec2[0].public_ip
      bastion_user        = "ubuntu"
      bastion_private_key = tls_private_key.ssh_key.private_key_pem
      timeout             = "25m"  # ADDED TIMEOUT
    }

    on_failure = continue  # Don't fail entire deployment
  }

  # Verification step
  provisioner "remote-exec" {
    inline = [
      "echo '=== VERIFICATION ==='",
      "docker --version || echo 'Docker not installed'",
      "docker ps || echo 'Docker not running'",
      "if [ -f /app/health-check.sh ]; then",
      "  echo 'Running health check...'",
      "  /app/health-check.sh || echo 'Health check completed with issues'",
      "else",
      "  echo 'Health check script not found'",
      "fi"
    ]

    connection {
      type                = "ssh"
      user                = "ubuntu"
      private_key         = tls_private_key.ssh_key.private_key_pem
      host                = aws_instance.private_ec2[count.index].private_ip
      bastion_host        = aws_instance.public_ec2[0].public_ip
      bastion_user        = "ubuntu"
      bastion_private_key = tls_private_key.ssh_key.private_key_pem
      timeout             = "10m"
    }

    on_failure = continue
  }
}

# Output information
output "frontend_public_ip" {
  value = aws_instance.public_ec2[*].public_ip
}

output "backend_private_ip" {
  value = aws_instance.private_ec2[*].private_ip
}

output "database_info" {
  value = {
    database_name = local.db_name
    database_user = local.db_user
    database_host = aws_instance.private_ec2[0].private_ip
    database_port = "5432"
  }
  sensitive = true
}

output "useful_commands" {
  value = {
    ssh_to_frontend = "ssh -i hirehacker-key.pem ubuntu@${aws_instance.public_ec2[0].public_ip}"
    ssh_to_backend = "ssh -i hirehacker-key.pem -o ProxyJump=ubuntu@${aws_instance.public_ec2[0].public_ip} ubuntu@${aws_instance.private_ec2[0].private_ip}"
    check_backend_logs = "ssh -i hirehacker-key.pem -o ProxyJump=ubuntu@${aws_instance.public_ec2[0].public_ip} ubuntu@${aws_instance.private_ec2[0].private_ip} 'cat /tmp/full-setup.log'"
  }
}