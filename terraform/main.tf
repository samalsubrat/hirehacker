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

variable "key_name" {
  description = "AWS key pair name"
  default     = "your-key-pair-name"
}

# 1. Lookup latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
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

# 2. VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${var.project_name}-vpc" }
}

# 3. Subnets (public and private)
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true
  tags = { Name = "${var.project_name}-public-subnet" }
}

resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-south-1a"
  tags = { Name = "${var.project_name}-private-subnet" }
}

# 4. Internet Gateway & Public Route Table
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public.id
}

# 5. NAT Gateway & Private Route Table
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_subnet.id
  depends_on    = [aws_internet_gateway.igw]
  tags = { Name = "${var.project_name}-nat" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
  tags = { Name = "${var.project_name}-private-rt" }
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private_subnet.id
  route_table_id = aws_route_table.private.id
}

# 6. Security Groups
resource "aws_security_group" "frontend" {
  name        = "${var.project_name}-frontend-sg"
  vpc_id      = aws_vpc.main.id
  description = "Allow HTTP and SSH"

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

  tags = { Name = "${var.project_name}-frontend-sg" }
}

resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  vpc_id      = aws_vpc.main.id
  description = "Allow traffic from VPC and frontend"

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

  tags = { Name = "${var.project_name}-backend-sg" }
}

# 7. Backend Instance (private)
resource "aws_instance" "backend_private" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.private_subnet.id
  vpc_security_group_ids = [aws_security_group.backend.id]
  key_name               = var.key_name
  associate_public_ip_address = false

  tags = { Name = "${var.project_name}-backend-instance" }

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

# 8. Local value updated after backend instance is created
locals {
  frontend_script = templatefile("${path.module}/modules/instances/scripts/frontend.sh.tpl", {
    backend_ip     = aws_instance.backend_private.private_ip
    frontend_image = "samalsubrat/hirehacker-frontend:latest"
  })
  backend_script = file("${path.module}/modules/instances/scripts/backend.sh")
}

# 9. Frontend Instance (public)
resource "aws_instance" "frontend" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.public_subnet.id
  vpc_security_group_ids      = [aws_security_group.frontend.id]
  key_name                    = var.key_name
  associate_public_ip_address = true

  tags = { Name = "${var.project_name}-frontend-instance" }

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
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "docker ps",
      "curl -f http://localhost || echo 'Frontend not responding'"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.public_ip
    }
  }

  depends_on = [aws_instance.backend_private]
}


# 10. Frontend EC2 Instance (public)
resource "aws_instance" "frontend" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.public_subnet.id
  vpc_security_group_ids      = [aws_security_group.frontend.id]
  key_name                    = var.key_name
  associate_public_ip_address = true

  tags = { Name = "${var.project_name}-frontend-instance" }

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
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "docker --version",
      "docker ps",
      "curl -f http://localhost || echo 'Frontend app not responding'"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = self.public_ip
    }
  }
}

# 11. Backend EC2 Instance (private)
resource "aws_instance" "backend_private" {
  count                   = 1
  ami                     = data.aws_ami.ubuntu.id
  instance_type           = "t2.micro"
  subnet_id               = aws_subnet.private_subnet.id
  vpc_security_group_ids  = [aws_security_group.backend.id]
  key_name                = var.key_name
  associate_public_ip_address = false

  tags = { Name = "${var.project_name}-backend-instance" }

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
