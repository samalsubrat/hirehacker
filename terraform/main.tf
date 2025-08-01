terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

variable "project_name" {
  default = "hirehacker"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "vpc_availability_zones" {
  type        = list(string)
  description = "Availability Zones"
  default     = ["ap-south-1a", "ap-south-1b"]
}

locals {
  frontend_script = templatefile("${path.module}/modules/instances/scripts/frontend.sh.tpl", {
    backend_ip = aws_instance.backend_private[0].private_ip
    frontend_image = "samalsubrat/hirehacker-frontend:latest" # Your Docker Hub image tag
  })

  backend_script = file("${path.module}/modules/instances/scripts/backend.sh")
}

# 1. VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# 2. Subnets (public and private)
resource "aws_subnet" "public_subnet" {
  count             = length(var.vpc_availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = var.vpc_availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "private_subnet" {
  count             = length(var.vpc_availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 3)
  availability_zone = var.vpc_availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
  }
}

# 3. Internet Gateway
resource "aws_internet_gateway" "igw_vpc" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
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
    Name = "${var.project_name}-public-rt"
  }
}

# 5. Route Table Association with Public Subnet
resource "aws_route_table_association" "public_subnet_association" {
  count          = length(var.vpc_availability_zones)
  subnet_id      = aws_subnet.public_subnet[count.index].id
  route_table_id = aws_route_table.route_table_public.id
}

# 6. Elastic IP for NAT
resource "aws_eip" "eip" {
  domain = "vpc"
  depends_on = [aws_internet_gateway.igw_vpc]
}

# 7. NAT Gateway in Public Subnet 0
resource "aws_nat_gateway" "hh_nat_gateway" {
  allocation_id = aws_eip.eip.id
  subnet_id     = aws_subnet.public_subnet[0].id

  depends_on = [aws_internet_gateway.igw_vpc]

  tags = {
    Name = "${var.project_name}-nat-gateway"
  }
}

# 8. Route Table for Private Subnets
resource "aws_route_table" "route_table_private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.hh_nat_gateway.id
  }

  depends_on = [aws_nat_gateway.hh_nat_gateway]

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

# 9. Route Table Association with Private Subnets
resource "aws_route_table_association" "private_subnet_association" {
  count          = length(var.vpc_availability_zones)
  subnet_id      = aws_subnet.private_subnet[count.index].id
  route_table_id = aws_route_table.route_table_private.id
}

# 10. Security Group for Frontend (Public)
resource "aws_security_group" "frontend" {
  name        = "${var.project_name}-frontend-sg"
  description = "Frontend security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
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
    Name = "${var.project_name}-frontend-sg"
  }
}

# 11. Security Group for Backend (Private)
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Backend security group"
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
    Name = "${var.project_name}-backend-sg"
  }
}

# 12. Key Pair (replace with your actual key pair name)
variable "key_name" {
  default = "your-key-pair-name"
}

# 13. Frontend EC2 Instance (Public)
resource "aws_instance" "frontend" {
  ami                         = "ami-0d8f6eb4f641ef691" # Ubuntu 22.04 LTS ap-south-1 (update as needed)
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_subnet[0].id
  vpc_security_group_ids      = [aws_security_group.frontend.id]
  key_name                   = var.key_name
  associate_public_ip_address = true

  tags = {
    Name = "${var.project_name}-frontend-instance"
  }

  provisioner "file" {
    content     = local.frontend_script
    destination = "/home/ubuntu/frontend.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /home/ubuntu/frontend.sh",
      "sudo /home/ubuntu/frontend.sh"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/${var.key_name}.pem") # Update path if needed
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "docker --version",
      "docker ps",
      "curl -f http://localhost || echo 'Frontend app not responding on localhost'"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.public_ip
    }
  }
}

# 14. Backend EC2 Instances (Private Subnet)
resource "aws_instance" "backend_private" {
  count                      = 2
  ami                        = "ami-0d8f6eb4f641ef691" # Ubuntu 22.04 LTS ap-south-1 (update as needed)
  instance_type              = "t3.micro"
  subnet_id                  = element(aws_subnet.private_subnet[*].id, count.index)
  vpc_security_group_ids     = [aws_security_group.backend.id]
  key_name                   = var.key_name
  associate_public_ip_address = false

  tags = {
    Name = "${var.project_name}-backend-instance-${count.index + 1}"
  }

  provisioner "file" {
    content     = local.backend_script
    destination = "/home/ubuntu/backend.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /home/ubuntu/backend.sh",
      "sudo /home/ubuntu/backend.sh"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.private_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "docker --version",
      "docker ps",
      "curl -f http://localhost:2358/about || echo 'Judge0 API not reachable'",
      "curl -f http://localhost:8000/health || echo 'Backend API not reachable'"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.private_ip
    }
  }
}
