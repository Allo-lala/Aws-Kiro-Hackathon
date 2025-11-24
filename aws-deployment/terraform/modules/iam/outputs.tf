# Outputs for IAM module

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_execution_role_name" {
  description = "Name of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.name
}

output "ecs_frontend_task_role_arn" {
  description = "ARN of the ECS frontend task role"
  value       = aws_iam_role.ecs_frontend_task.arn
}

output "ecs_frontend_task_role_name" {
  description = "Name of the ECS frontend task role"
  value       = aws_iam_role.ecs_frontend_task.name
}

output "ecs_backend_task_role_arn" {
  description = "ARN of the ECS backend task role"
  value       = aws_iam_role.ecs_backend_task.arn
}

output "ecs_backend_task_role_name" {
  description = "Name of the ECS backend task role"
  value       = aws_iam_role.ecs_backend_task.name
}

output "rds_enhanced_monitoring_role_arn" {
  description = "ARN of the RDS enhanced monitoring role"
  value       = aws_iam_role.rds_enhanced_monitoring.arn
}

output "rds_enhanced_monitoring_role_name" {
  description = "Name of the RDS enhanced monitoring role"
  value       = aws_iam_role.rds_enhanced_monitoring.name
}

output "ecs_autoscaling_role_arn" {
  description = "ARN of the ECS autoscaling role"
  value       = aws_iam_role.ecs_autoscaling.arn
}

output "ecs_autoscaling_role_name" {
  description = "Name of the ECS autoscaling role"
  value       = aws_iam_role.ecs_autoscaling.name
}

output "cloudwatch_events_role_arn" {
  description = "ARN of the CloudWatch Events role"
  value       = aws_iam_role.cloudwatch_events.arn
}

output "cloudwatch_events_role_name" {
  description = "Name of the CloudWatch Events role"
  value       = aws_iam_role.cloudwatch_events.name
}

output "codebuild_role_arn" {
  description = "ARN of the CodeBuild service role"
  value       = aws_iam_role.codebuild.arn
}

output "codebuild_role_name" {
  description = "Name of the CodeBuild service role"
  value       = aws_iam_role.codebuild.name
}