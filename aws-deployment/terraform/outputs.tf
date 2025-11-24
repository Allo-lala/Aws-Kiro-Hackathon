# Outputs for Terraform configuration

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = module.security_groups.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = module.security_groups.ecs_security_group_id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = module.security_groups.rds_security_group_id
}

# IAM Role Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = module.iam_roles.ecs_task_execution_role_arn
}

output "ecs_frontend_task_role_arn" {
  description = "ARN of the ECS frontend task role"
  value       = module.iam_roles.ecs_frontend_task_role_arn
}

output "ecs_backend_task_role_arn" {
  description = "ARN of the ECS backend task role"
  value       = module.iam_roles.ecs_backend_task_role_arn
}

output "rds_enhanced_monitoring_role_arn" {
  description = "ARN of the RDS enhanced monitoring role"
  value       = module.iam_roles.rds_enhanced_monitoring_role_arn
}

output "ecs_autoscaling_role_arn" {
  description = "ARN of the ECS autoscaling role"
  value       = module.iam_roles.ecs_autoscaling_role_arn
}

output "cloudwatch_events_role_arn" {
  description = "ARN of the CloudWatch Events role"
  value       = module.iam_roles.cloudwatch_events_role_arn
}

output "codebuild_role_arn" {
  description = "ARN of the CodeBuild service role"
  value       = module.iam_roles.codebuild_role_arn
}

output "vpc_endpoint_security_group_id" {
  description = "ID of the VPC endpoint security group"
  value       = module.security_groups.vpc_endpoint_security_group_id
}