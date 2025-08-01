# 1. Terraform & Provider Configuration
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

# 1.1 Variables
variable "vpc_availability_zones" {
  type        = list(string)
  description = "Availability Zones"
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "hirehacker"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# 1.2 Latest Ubuntu 22.04 AMI
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

# 2. VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# 3. Subnets (Public and Private)
resource "aws_subnet" "public_subnet" {
  count             = length(var.vpc_availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 1)
  availability_zone = element(var.vpc_availability_zones, count.index)

  tags = {
    Name = "${var.project_name} Public Subnet ${count.index + 1}"
  }
}

resource "aws_subnet" "private_subnet" {
  count             = length(var.vpc_availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 3)
  availability_zone = element(var.vpc_availability_zones, count.index)

  tags = {
    Name = "${var.project_name} Private Subnet ${count.index + 1}"
  }
}

# 4. Internet Gateway
resource "aws_internet_gateway" "igw_vpc" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name} Internet Gateway"
  }
}

# 5. Route Table for Public Subnets
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

# 6. Associate Public Subnets with Route Table
resource "aws_route_table_association" "public_subnet_association" {
  count          = length(var.vpc_availability_zones)
  route_table_id = aws_route_table.route_table_public.id
  subnet_id      = element(aws_subnet.public_subnet[*].id, count.index)
}

# 7. Elastic IP for NAT Gateway
resource "aws_eip" "eip" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw_vpc]
}

# 8. NAT Gateway
resource "aws_nat_gateway" "hh_nat_gateway" {
  subnet_id     = element(aws_subnet.public_subnet[*].id, 0)
  allocation_id = aws_eip.eip.id

  depends_on = [aws_internet_gateway.igw_vpc]

  tags = {
    Name = "${var.project_name} NAT Gateway"
  }
}

# 9. Route Table for Private Subnets
resource "aws_route_table" "route_table_private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_nat_gateway.hh_nat_gateway.id
  }

  depends_on = [aws_nat_gateway.hh_nat_gateway]

  tags = {
    Name = "Private Subnet Route Table"
  }
}

# 10. Associate Private Subnets with Private Route Table
resource "aws_route_table_association" "private_subnet_association" {
  count          = length(var.vpc_availability_zones)
  route_table_id = aws_route_table.route_table_private.id
  subnet_id      = element(aws_subnet.private_subnet[*].id, count.index)
}

# 11. Security Group for Public EC2 (Frontend)
resource "aws_security_group" "frontend" {
  name        = "${var.project_name}-frontend-sg"
  description = "Security group for frontend/public instances"
  vpc_id      = aws_vpc.main.id

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

# 12. Security Group for Private EC2 (Backend, PostgreSQL, Judge0)
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Security group for backend instance"
  vpc_id      = aws_vpc.main.id

  # SSH from frontend
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id]
  }

  # Judge0 API
  ingress {
    from_port   = 2358
    to_port     = 2358
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # PostgreSQL
  ingress {
    from_port   = 5432
    to_port     = 5432
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

# 13. Public EC2 Instances
resource "aws_instance" "public_ec2" {
  count                       = length(aws_subnet.public_subnet)
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = "t2.micro"
  subnet_id                   = element(aws_subnet.public_subnet[*].id, count.index)
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.frontend.id]

  tags = {
    Name = "${var.project_name} Public EC2 ${count.index + 1}"
  }
}

# 14. Private EC2 Instances
resource "aws_instance" "private_ec2" {
  count                       = length(aws_subnet.private_subnet)
  ami                         = data.aws_ami.ubuntu_2204.id
  instance_type               = "t2.micro"
  subnet_id                   = element(aws_subnet.private_subnet[*].id, count.index)
  associate_public_ip_address = false
  vpc_security_group_ids      = [aws_security_group.backend.id]

  tags = {
    Name = "${var.project_name} Private EC2 ${count.index + 1}"
  }
}
