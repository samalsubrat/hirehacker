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
  default = ["ap-south-1a", "ap-south-1b"]
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

# 8. Route Table for Private Subnet
resource "aws_route_table" "route_table_private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_nat_gateway.hh_nat_gateway.id
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
      "sudo /home/ubuntu/frontend.sh"
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

# 14. EC2 Backend (Private) with provisioner
resource "aws_instance" "private_ec2" {
  count                       = length(aws_subnet.private_subnet)
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = "t2.micro"
  subnet_id                   = element(aws_subnet.private_subnet[*].id, count.index)
  associate_public_ip_address = false # TEMPORARY: required for provisioning via SSH
  vpc_security_group_ids      = [aws_security_group.backend.id]
  key_name                    = aws_key_pair.generated_key.key_name

  provisioner "file" {
    source      = "${path.module}/backend.sh"
    destination = "/home/ubuntu/backend.sh"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /home/ubuntu/backend.sh",
      "sudo /home/ubuntu/backend.sh"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.ssh_key.private_key_pem
      host        = self.public_ip
    }
  }

  tags = {
    Name = "hirehacker-private-ec2-${count.index + 1}"
  }
}
