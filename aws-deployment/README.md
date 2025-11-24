# AWS Deployment Guide

This guide will help you deploy the Eco-Friendly Route Planner to AWS using multiple deployment options.

## Deployment Options

1. **AWS ECS with Fargate** (Recommended for production)
2. **AWS EC2 with Docker Compose** (Simple and cost-effective)
3. **AWS EKS** (For Kubernetes-based deployments)
4. **AWS Elastic Beanstalk** (Managed platform)

## Prerequisites

- AWS CLI installed and configured
- Docker installed locally
- Domain name (optional but recommended)
- AWS account with appropriate permissions

## Quick Start - ECS Deployment

### 1. Set up AWS Infrastructure

```bash
# Clone and navigate to project
cd aws-deployment

# Deploy infrastructure
./deploy-aws.sh setup

# Deploy application
./deploy-aws.sh deploy
```

### 2. Configure Environment Variables

Create `aws-deployment/.env.aws`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id
ECR_REPOSITORY_PREFIX=eco-route-planner

# Application Configuration
DOMAIN_NAME=your-domain.com
CERTIFICATE_ARN=arn:aws:acm:region:account:certificate/cert-id

# Database Configuration (RDS)
DB_INSTANCE_CLASS=db.t3.micro
DB_ALLOCATED_STORAGE=20
DB_NAME=eco_route_planner
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password

# API Keys
GOOGLE_MAPS_API_KEY=your-google-maps-key
SENDGRID_API_KEY=your-sendgrid-key
JWT_SECRET=your-jwt-secret
```

## Detailed Deployment Steps

### Option 1: ECS with Fargate (Recommended)

This option provides:
- Serverless container management
- Auto-scaling
- Load balancing
- Managed database (RDS)
- CDN (CloudFront)

### Option 2: EC2 with Docker Compose

This option provides:
- Simple deployment
- Lower cost for small applications
- Full control over infrastructure

### Option 3: Elastic Beanstalk

This option provides:
- Managed platform
- Easy deployment
- Built-in monitoring

## Cost Estimation

### ECS Deployment (Monthly)
- ECS Fargate: ~$30-50
- RDS (t3.micro): ~$15-20
- ALB: ~$20
- CloudFront: ~$1-5
- **Total: ~$66-95/month**

### EC2 Deployment (Monthly)
- EC2 (t3.small): ~$15-20
- EBS Storage: ~$2-5
- **Total: ~$17-25/month**

## Security Features

- VPC with private subnets
- Security groups with minimal access
- SSL/TLS certificates
- Secrets management with AWS Secrets Manager
- IAM roles with least privilege

## Monitoring and Logging

- CloudWatch logs and metrics
- Application Load Balancer health checks
- RDS monitoring
- Custom application metrics

## Backup and Recovery

- RDS automated backups
- ECS service auto-recovery
- Infrastructure as Code for disaster recovery

## Next Steps

1. Choose your deployment option
2. Configure AWS credentials
3. Set up environment variables
4. Run deployment script
5. Configure domain and SSL
6. Set up monitoring and alerts