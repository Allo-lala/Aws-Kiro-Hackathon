# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Eco-Friendly Route Planner to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured to access your cluster
- Container images pushed to a registry
- Secrets configured for sensitive data

## Quick Deploy

```bash
# Create namespace
kubectl create namespace eco-route-planner

# Apply all manifests
kubectl apply -f k8s/ -n eco-route-planner

# Check deployment status
kubectl get pods -n eco-route-planner
```

## Manifests Overview

- `namespace.yaml` - Namespace definition
- `configmap.yaml` - Application configuration
- `secrets.yaml` - Sensitive configuration (template)
- `postgres-deployment.yaml` - PostgreSQL database
- `backend-deployment.yaml` - Backend API service
- `frontend-deployment.yaml` - Frontend web application
- `ingress.yaml` - Ingress configuration for external access

## Configuration

### 1. Create Secrets

```bash
# Create secrets from .env file
kubectl create secret generic eco-route-secrets \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --from-literal=db-password=$(openssl rand -hex 16) \
  --from-literal=google-maps-api-key=YOUR_KEY \
  --from-literal=sendgrid-api-key=YOUR_KEY \
  -n eco-route-planner
```

### 2. Update Image References

Edit deployment files to reference your container registry:

```yaml
image: your-registry.com/eco-route-backend:latest
image: your-registry.com/eco-route-frontend:latest
```

### 3. Configure Ingress

Update `ingress.yaml` with your domain:

```yaml
spec:
  rules:
  - host: yourdomain.com
```

## Scaling

```bash
# Scale backend
kubectl scale deployment eco-route-backend --replicas=3 -n eco-route-planner

# Scale frontend
kubectl scale deployment eco-route-frontend --replicas=2 -n eco-route-planner

# Autoscaling
kubectl autoscale deployment eco-route-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n eco-route-planner
```

## Monitoring

```bash
# View logs
kubectl logs -f deployment/eco-route-backend -n eco-route-planner
kubectl logs -f deployment/eco-route-frontend -n eco-route-planner

# Check health
kubectl exec -it deployment/eco-route-backend -n eco-route-planner -- \
  curl http://localhost:3000/health

# Port forward for local access
kubectl port-forward svc/eco-route-backend 3000:3000 -n eco-route-planner
kubectl port-forward svc/eco-route-frontend 8080:8080 -n eco-route-planner
```

## Updating

```bash
# Update image
kubectl set image deployment/eco-route-backend \
  backend=your-registry.com/eco-route-backend:v2.0 \
  -n eco-route-planner

# Rollback
kubectl rollout undo deployment/eco-route-backend -n eco-route-planner

# Check rollout status
kubectl rollout status deployment/eco-route-backend -n eco-route-planner
```

## Troubleshooting

```bash
# Describe pod
kubectl describe pod <pod-name> -n eco-route-planner

# Get events
kubectl get events -n eco-route-planner --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n eco-route-planner
kubectl top nodes
```

## Production Considerations

1. **Persistent Storage**: Use PersistentVolumeClaims for database
2. **Secrets Management**: Use external secrets manager (Vault, AWS Secrets Manager)
3. **Monitoring**: Deploy Prometheus and Grafana
4. **Logging**: Configure centralized logging (ELK, Loki)
5. **Backup**: Set up automated database backups
6. **SSL/TLS**: Configure cert-manager for automatic certificate management
7. **Network Policies**: Implement network policies for security
8. **Resource Limits**: Set appropriate resource requests and limits
