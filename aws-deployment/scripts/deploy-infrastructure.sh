#!/bin/bash

# Deploy AWS Infrastructure for Eco-Friendly Route Planner
# This script deploys the CloudFormation templates for VPC, Security Groups, and IAM roles

set -e

# Configuration
PROJECT_NAME="eco-route-planner"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TEMPLATES_BUCKET="${TEMPLATES_BUCKET:-${PROJECT_NAME}-${ENVIRONMENT}-cf-templates}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    print_status "AWS CLI is configured and ready"
}

# Function to create S3 bucket for templates if it doesn't exist
create_templates_bucket() {
    print_status "Checking if S3 bucket ${TEMPLATES_BUCKET} exists..."
    
    if aws s3 ls "s3://${TEMPLATES_BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
        print_status "Creating S3 bucket ${TEMPLATES_BUCKET}..."
        
        if [ "$AWS_REGION" = "us-east-1" ]; then
            aws s3 mb "s3://${TEMPLATES_BUCKET}"
        else
            aws s3 mb "s3://${TEMPLATES_BUCKET}" --region "$AWS_REGION"
        fi
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$TEMPLATES_BUCKET" \
            --versioning-configuration Status=Enabled
            
        print_status "S3 bucket created successfully"
    else
        print_status "S3 bucket ${TEMPLATES_BUCKET} already exists"
    fi
}

# Function to upload templates to S3
upload_templates() {
    print_status "Uploading CloudFormation templates to S3..."
    
    local templates_dir="$(dirname "$0")/../cloudformation"
    
    aws s3 sync "$templates_dir" "s3://${TEMPLATES_BUCKET}/" \
        --exclude "*.md" \
        --delete
        
    print_status "Templates uploaded successfully"
}

# Function to validate CloudFormation templates
validate_templates() {
    print_status "Validating CloudFormation templates..."
    
    local templates_dir="$(dirname "$0")/../cloudformation"
    
    for template in "$templates_dir"/*.yaml; do
        if [ -f "$template" ]; then
            template_name=$(basename "$template")
            print_status "Validating $template_name..."
            
            aws cloudformation validate-template \
                --template-body "file://$template" > /dev/null
                
            print_status "$template_name is valid"
        fi
    done
}

# Function to deploy CloudFormation stack
deploy_stack() {
    local stack_name="${PROJECT_NAME}-${ENVIRONMENT}-infrastructure"
    
    print_status "Deploying infrastructure stack: $stack_name"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        print_status "Stack exists, updating..."
        operation="update-stack"
    else
        print_status "Stack doesn't exist, creating..."
        operation="create-stack"
    fi
    
    # Deploy the stack
    aws cloudformation "$operation" \
        --stack-name "$stack_name" \
        --template-url "https://${TEMPLATES_BUCKET}.s3.amazonaws.com/master-infrastructure.yaml" \
        --parameters \
            ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
            ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
            ParameterKey=TemplatesBucketName,ParameterValue="$TEMPLATES_BUCKET" \
        --capabilities CAPABILITY_NAMED_IAM \
        --tags \
            Key=Project,Value="$PROJECT_NAME" \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=ManagedBy,Value="CloudFormation"
    
    print_status "Waiting for stack operation to complete..."
    
    if [ "$operation" = "create-stack" ]; then
        aws cloudformation wait stack-create-complete --stack-name "$stack_name"
    else
        aws cloudformation wait stack-update-complete --stack-name "$stack_name"
    fi
    
    print_status "Stack operation completed successfully!"
}

# Function to display stack outputs
display_outputs() {
    local stack_name="${PROJECT_NAME}-${ENVIRONMENT}-infrastructure"
    
    print_status "Stack outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
}

# Main execution
main() {
    print_status "Starting AWS infrastructure deployment for ${PROJECT_NAME} (${ENVIRONMENT})"
    
    check_aws_cli
    create_templates_bucket
    validate_templates
    upload_templates
    deploy_stack
    display_outputs
    
    print_status "Infrastructure deployment completed successfully!"
    print_warning "Remember to deploy the application services (ECS, RDS, ALB) next."
}

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deploy AWS infrastructure for Eco-Friendly Route Planner"
    echo ""
    echo "Environment Variables:"
    echo "  ENVIRONMENT     Environment name (default: production)"
    echo "  AWS_REGION      AWS region (default: us-east-1)"
    echo "  TEMPLATES_BUCKET S3 bucket for templates (default: eco-route-planner-ENV-cf-templates)"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy to production"
    echo "  ENVIRONMENT=staging $0      # Deploy to staging"
    echo "  AWS_REGION=us-west-2 $0     # Deploy to us-west-2"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac