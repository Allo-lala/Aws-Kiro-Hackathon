# AWS Deployment Design Document

## Overview

This design document outlines the architecture for deploying the Eco-Friendly Route Planner to AWS using a containerized, scalable, and secure infrastructure. The deployment leverages AWS managed services to provide high availability, security, and cost-effectiveness while maintaining operational simplicity.

The architecture follows AWS Well-Architected Framework principles across five pillars: operational excellence, security, reliability, performance efficiency, and cost optimization.

## Architecture

### High-Level Architecture

The deployment uses a three-tier architecture:

1. **Presentation Tier**: CloudFront CDN + Application Load Balancer
2. **Application Tier**: ECS Fargate containers in private subnets
3. **Data Tier**: RDS PostgreSQL in private subnets with Multi-AZ deployment

### Network Architecture

```
Internet Gateway
    |
Public Subnets (2 AZs)
    |-- Application Load Balancer
    |-- NAT Gateways
    |
Private Subnets (2 AZs)
    |-- ECS Fargate Tasks
    |-- RDS PostgreSQL (Multi-AZ)
```

### Service Architecture

- **Frontend Service**: React application served via CloudFront and S3
- **Backend Service**: Node.js/TypeScript API running on ECS Fargate
- **Database**: PostgreSQL on RDS with automated backups
- **Container Registry**: ECR for Docker image storage
- **Secrets Management**: AWS Secrets Manager for API keys and credentials
- **Monitoring**: CloudWatch for logs, metrics, and alarms

## Components and Interfaces

### Core Infrastructure Components

#### 1. Virtual Private Cloud (VPC)
- **Purpose**: Isolated network environment for all resources
- **Configuration**: 
  - CIDR: 10.0.0.0/16
  - 2 Availability Zones for high availability
  - Public subnets: 10.0.1.0/24, 10.0.2.0/24
  - Private subnets: 10.0.10.0/24, 10.0.20.0/24
  - Database subnets: 10.0.100.0/24, 10.0.200.0/24

#### 2. Application Load Balancer (ALB)
- **Purpose**: Distribute incoming traffic and terminate SSL
- **Configuration**:
  - Internet-facing in public subnets
  - SSL certificate from AWS Certificate Manager
  - Health checks on /health endpoint
  - Target groups for backend services

#### 3. ECS Cluster with Fargate
- **Purpose**: Container orchestration for application services
- **Configuration**:
  - Fargate launch type for serverless containers
  - Auto-scaling based on CPU/memory metrics
  - Service discovery for inter-service communication
  - Task definitions with resource limits

#### 4. RDS PostgreSQL
- **Purpose**: Managed database service
- **Configuration**:
  - Multi-AZ deployment for high availability
  - Automated backups with 7-day retention
  - Encryption at rest and in transit
  - Parameter groups for performance tuning

### Application Services

#### 1. Frontend Service
- **Container**: nginx serving React build
- **Resources**: 0.25 vCPU, 512 MB memory
- **Scaling**: 1-3 tasks based on request count
- **Health Check**: HTTP GET /

#### 2. Backend API Service
- **Container**: Node.js application
- **Resources**: 0.5 vCPU, 1024 MB memory
- **Scaling**: 2-10 tasks based on CPU utilization
- **Health Check**: HTTP GET /api/health

### Security Components

#### 1. IAM Roles and Policies
- **ECS Task Role**: Access to Secrets Manager and CloudWatch
- **ECS Execution Role**: Pull images from ECR and write logs
- **RDS Enhanced Monitoring Role**: CloudWatch metrics access

#### 2. Security Groups
- **ALB Security Group**: Allow HTTP/HTTPS from internet
- **ECS Security Group**: Allow traffic from ALB only
- **RDS Security Group**: Allow PostgreSQL from ECS only

#### 3. Secrets Management
- **Database Credentials**: Stored in Secrets Manager
- **API Keys**: Stored in Secrets Manager with rotation
- **JWT Secrets**: Generated and stored securely

## Data Models

### Infrastructure Configuration

```typescript
interface AWSInfrastructure {
  vpc: {
    cidr: string;
    availabilityZones: string[];
    publicSubnets: string[];
    privateSubnets: string[];
    databaseSubnets: string[];
  };
  
  ecs: {
    clusterName: string;
    services: ECSService[];
    taskDefinitions: TaskDefinition[];
  };
  
  rds: {
    engine: 'postgres';
    version: string;
    instanceClass: string;
    allocatedStorage: number;
    multiAZ: boolean;
    backupRetentionPeriod: number;
  };
  
  loadBalancer: {
    type: 'application';
    scheme: 'internet-facing';
    listeners: Listener[];
    targetGroups: TargetGroup[];
  };
}

interface ECSService {
  name: string;
  taskDefinition: string;
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  targetGroup: string;
}

interface TaskDefinition {
  family: string;
  cpu: string;
  memory: string;
  containers: Container[];
  executionRole: string;
  taskRole: string;
}
```

### Deployment Configuration

```typescript
interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  region: string;
  accountId: string;
  
  domain: {
    name: string;
    certificateArn: string;
    hostedZoneId: string;
  };
  
  scaling: {
    frontend: ScalingConfig;
    backend: ScalingConfig;
  };
  
  monitoring: {
    logRetentionDays: number;
    alarmNotificationTopic: string;
    dashboardName: string;
  };
}

interface ScalingConfig {
  minCapacity: number;
  maxCapacity: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleOutCooldown: number;
  scaleInCooldown: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Infrastructure Deployment Properties

**Property 1: ECS Fargate Service Creation**
*For any* deployment configuration, when infrastructure is deployed, all specified services should be created as ECS Fargate services with correct launch type configuration
**Validates: Requirements 1.1**

**Property 2: ECR Image Storage**
*For any* container deployment, all Docker images should be stored in Amazon ECR repositories with proper naming conventions and tags
**Validates: Requirements 1.2**

**Property 3: Container Image References**
*For any* ECS task definition, all container images should reference ECR repositories and use the latest available tags
**Validates: Requirements 1.3**

**Property 4: Auto-scaling Configuration**
*For any* ECS service, auto-scaling policies should be configured with appropriate CPU and memory thresholds for horizontal scaling
**Validates: Requirements 1.4**

**Property 5: Container Restart Policy**
*For any* ECS service configuration, health checks and restart policies should ensure failed containers restart within the specified time limit
**Validates: Requirements 1.5**

### Network Security Properties

**Property 6: VPC Resource Isolation**
*For any* AWS resource deployment, all resources should be created within the designated VPC and not in the default VPC
**Validates: Requirements 2.1**

**Property 7: Private Subnet Placement**
*For any* ECS service deployment, all application containers should be placed exclusively in private subnets
**Validates: Requirements 2.2**

**Property 8: Load Balancer Public Placement**
*For any* Application Load Balancer deployment, the ALB should be configured in public subnets only
**Validates: Requirements 2.3**

**Property 9: Security Group Minimal Access**
*For any* security group configuration, only the minimum required ports and protocols should be allowed with no overly permissive rules
**Validates: Requirements 2.4**

**Property 10: Database Access Restriction**
*For any* RDS security group, database access should be restricted to application security groups only
**Validates: Requirements 2.5**

### Database Configuration Properties

**Property 11: RDS PostgreSQL Deployment**
*For any* database deployment, the system should create an RDS PostgreSQL instance with the specified configuration
**Validates: Requirements 3.1**

**Property 12: Automated Backup Configuration**
*For any* RDS instance, automated backups should be enabled with exactly 7-day retention period
**Validates: Requirements 3.2**

**Property 13: Multi-AZ Database Placement**
*For any* RDS deployment, the database should be configured for Multi-AZ deployment in private subnets
**Validates: Requirements 3.3**

**Property 14: Database Encryption**
*For any* RDS instance, encryption at rest and SSL enforcement should be enabled
**Validates: Requirements 3.4**

**Property 15: Secrets Manager Integration**
*For any* database credential requirement, credentials should be stored in AWS Secrets Manager and referenced by ARN
**Validates: Requirements 3.5**

### Traffic and SSL Properties

**Property 16: Load Balancer Traffic Routing**
*For any* incoming request, traffic should be routed through the Application Load Balancer to ECS services
**Validates: Requirements 4.1**

**Property 17: HTTPS Redirection**
*For any* HTTP request to the load balancer, it should be automatically redirected to HTTPS
**Validates: Requirements 4.2**

**Property 18: ACM Certificate Usage**
*For any* SSL configuration, certificates should be provisioned and managed through AWS Certificate Manager
**Validates: Requirements 4.3**

**Property 19: Route53 DNS Configuration**
*For any* domain setup, DNS records should be managed through Route53 with proper A/AAAA record configuration
**Validates: Requirements 4.4**

**Property 20: CloudFront CDN Configuration**
*For any* static content delivery, CloudFront distribution should be configured with appropriate caching policies
**Validates: Requirements 4.5**

### Security and Access Properties

**Property 21: Secrets Manager Storage**
*For any* API key or sensitive configuration, values should be stored in AWS Secrets Manager and not hardcoded
**Validates: Requirements 5.1**

**Property 22: IAM Least Privilege**
*For any* IAM role configuration, permissions should follow least privilege principles with only required actions allowed
**Validates: Requirements 5.2**

**Property 23: Runtime Secret Retrieval**
*For any* container startup, secrets should be retrieved from Secrets Manager at runtime without being embedded in images
**Validates: Requirements 5.3**

**Property 24: Service Role Separation**
*For any* ECS service deployment, each service should have its own dedicated IAM role with service-specific permissions
**Validates: Requirements 5.4**

**Property 25: Log Security**
*For any* application log entry, sensitive information should be filtered out and not appear in CloudWatch logs
**Validates: Requirements 5.5**

### Monitoring Properties

**Property 26: CloudWatch Logs Integration**
*For any* ECS task, logs should be configured to stream to CloudWatch Logs with proper log group configuration
**Validates: Requirements 6.1**

**Property 27: Metrics Collection**
*For any* deployed service, CloudWatch metrics should be collected for CPU, memory, and custom application metrics
**Validates: Requirements 6.2**

**Property 28: Health Check Configuration**
*For any* ALB target group, health checks should be configured with appropriate endpoints and thresholds
**Validates: Requirements 6.3**

**Property 29: Critical Metric Alarms**
*For any* critical system metric, CloudWatch alarms should be configured with appropriate thresholds and notification actions
**Validates: Requirements 6.4**

**Property 30: Structured Logging**
*For any* application log, entries should include correlation IDs and follow structured logging format
**Validates: Requirements 6.5**

## Error Handling

### Infrastructure Deployment Errors

1. **CloudFormation Stack Failures**
   - Automatic rollback on stack creation failure
   - Detailed error reporting with resource-specific failure reasons
   - Validation of template syntax before deployment

2. **ECS Service Deployment Failures**
   - Health check failures trigger automatic rollback
   - Task placement failures logged with detailed error messages
   - Service discovery registration failures handled gracefully

3. **Database Connection Errors**
   - Connection pool management with retry logic
   - Secrets Manager retrieval failures with exponential backoff
   - Database migration failures with rollback procedures

### Runtime Error Handling

1. **Container Health Check Failures**
   - Automatic container replacement by ECS
   - Load balancer removes unhealthy targets
   - CloudWatch alarms for repeated failures

2. **Auto-scaling Failures**
   - Fallback to manual scaling if auto-scaling fails
   - Detailed logging of scaling decisions and failures
   - Circuit breaker pattern for scaling operations

3. **Secret Retrieval Failures**
   - Cached secrets with TTL for temporary failures
   - Graceful degradation when non-critical secrets unavailable
   - Alert notifications for secret access failures

## Testing Strategy

### Infrastructure Testing

**Unit Testing Approach:**
- CloudFormation/Terraform template validation
- IAM policy simulation testing
- Security group rule validation
- Resource tagging compliance checks

**Property-Based Testing Approach:**
- AWS resource configuration validation using AWS Config Rules
- Security compliance testing across all environments
- Cost optimization validation through AWS Cost Explorer APIs
- Performance testing of auto-scaling behaviors

**Testing Framework:**
- **Primary Framework**: AWS CDK Testing Framework for infrastructure validation
- **Property Testing Library**: AWS Config Rules for continuous compliance testing
- **Integration Testing**: LocalStack for local AWS service simulation

**Property-Based Test Configuration:**
- Each property-based test will run a minimum of 100 iterations
- Tests will use randomized infrastructure configurations within valid parameters
- Each test will be tagged with the format: **Feature: aws-deployment, Property {number}: {property_text}**

### Deployment Testing

**Continuous Integration Testing:**
1. Template syntax validation
2. Security policy compliance checks
3. Cost estimation validation
4. Resource limit compliance

**Integration Testing:**
1. End-to-end deployment in staging environment
2. Service connectivity validation
3. SSL certificate validation
4. Database connectivity testing

**Disaster Recovery Testing:**
1. Automated failover testing
2. Backup restoration validation
3. Cross-region replication testing
4. Recovery time objective (RTO) validation

### Monitoring and Alerting Testing

**Synthetic Monitoring:**
- Health check endpoint validation
- SSL certificate expiration monitoring
- DNS resolution testing
- Performance baseline validation

**Alert Testing:**
- CloudWatch alarm threshold validation
- Notification delivery testing
- Escalation procedure validation
- False positive rate monitoring