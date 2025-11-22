# Deployment Checklist

Use this checklist to ensure a successful deployment of the Eco-Friendly Route Planner.

## Pre-Deployment Checklist

### Environment Setup
- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] `.env` file created from `.env.example`
- [ ] All required API keys obtained
- [ ] Database password generated
- [ ] JWT secret generated
- [ ] Session secret generated

### Configuration Validation
- [ ] `JWT_SECRET` is not using default value
- [ ] `DB_PASSWORD` is strong and unique
- [ ] `SESSION_SECRET` is not using default value
- [ ] Google Maps API key OR Geoapify API key configured
- [ ] SendGrid API key configured
- [ ] Email sender address configured
- [ ] CORS origins configured correctly
- [ ] Frontend URL matches deployment URL
- [ ] Backend URL matches deployment URL

### Security Review
- [ ] All secrets are unique and strong
- [ ] No sensitive data in version control
- [ ] `.env` file is in `.gitignore`
- [ ] Rate limiting configured
- [ ] HTTPS enabled for production
- [ ] Security headers configured
- [ ] Database not exposed externally
- [ ] Non-root users in containers

## Deployment Steps

### Development Deployment
- [ ] Run `./scripts/deploy.sh dev`
- [ ] Verify all services start successfully
- [ ] Check backend health: `curl http://localhost:3000/health`
- [ ] Check frontend health: `curl http://localhost:8080/health`
- [ ] Test user registration
- [ ] Test user login
- [ ] Test route calculation
- [ ] Review logs for errors

### Production Deployment
- [ ] Review security checklist
- [ ] Update image references in docker-compose.prod.yml
- [ ] Build production images
- [ ] Push images to registry
- [ ] Run `./scripts/deploy.sh prod`
- [ ] Verify all services start successfully
- [ ] Check backend health endpoint
- [ ] Check backend readiness endpoint
- [ ] Check frontend health endpoint
- [ ] Test complete user flow
- [ ] Verify database connectivity
- [ ] Test external API integration
- [ ] Verify email sending works

## Post-Deployment Checklist

### Monitoring Setup
- [ ] Health checks responding correctly
- [ ] Logs being written to files
- [ ] Error logs being captured
- [ ] System metrics accessible via admin dashboard
- [ ] Database connections monitored
- [ ] API usage tracked

### Backup Configuration
- [ ] Database backup script tested
- [ ] Automated backups scheduled (cron)
- [ ] Backup retention policy configured
- [ ] Restore procedure tested
- [ ] Backups stored off-site

### Performance Verification
- [ ] Response times acceptable
- [ ] Database queries optimized
- [ ] Static assets cached properly
- [ ] API rate limiting working
- [ ] Memory usage within limits
- [ ] CPU usage within limits

### Security Verification
- [ ] HTTPS working correctly
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection active
- [ ] Authentication working
- [ ] Authorization working
- [ ] Session management secure

### Functional Testing
- [ ] User registration works
- [ ] Email verification works
- [ ] User login works
- [ ] Password reset works
- [ ] Route calculation works
- [ ] Trip saving works
- [ ] User preferences persist
- [ ] Trip history displays
- [ ] Admin dashboard accessible
- [ ] User management works
- [ ] Audit logging works

### Documentation
- [ ] Deployment guide reviewed
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Backup procedures documented
- [ ] Troubleshooting guide available
- [ ] Runbook created for operations team

## Kubernetes Deployment (Optional)

### Pre-Deployment
- [ ] Kubernetes cluster available
- [ ] kubectl configured
- [ ] Container images pushed to registry
- [ ] Secrets created in cluster
- [ ] ConfigMaps created
- [ ] Persistent volumes configured
- [ ] Ingress controller installed
- [ ] Cert-manager installed (for SSL)

### Deployment
- [ ] Namespace created
- [ ] ConfigMap applied
- [ ] Secrets applied
- [ ] PostgreSQL deployment applied
- [ ] Backend deployment applied
- [ ] Frontend deployment applied
- [ ] Services created
- [ ] Ingress configured
- [ ] DNS records updated

### Verification
- [ ] All pods running
- [ ] Services accessible
- [ ] Ingress routing correctly
- [ ] SSL certificates issued
- [ ] Health checks passing
- [ ] Logs accessible
- [ ] Metrics available

## Rollback Plan

### Preparation
- [ ] Previous version images tagged
- [ ] Database backup created before deployment
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

### Rollback Steps (if needed)
1. [ ] Stop current deployment
2. [ ] Restore database from backup (if schema changed)
3. [ ] Deploy previous version
4. [ ] Verify services healthy
5. [ ] Test critical functionality
6. [ ] Notify team of rollback

## Maintenance Schedule

### Daily
- [ ] Review error logs
- [ ] Check health endpoints
- [ ] Monitor system metrics
- [ ] Verify backups completed

### Weekly
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Review security logs
- [ ] Update dependencies (if needed)

### Monthly
- [ ] Review and rotate API keys
- [ ] Update SSL certificates (if needed)
- [ ] Review and optimize database
- [ ] Security audit
- [ ] Performance review

### Quarterly
- [ ] Disaster recovery drill
- [ ] Security penetration testing
- [ ] Capacity planning review
- [ ] Documentation update

## Emergency Contacts

- [ ] DevOps team contact information documented
- [ ] Database administrator contact documented
- [ ] Security team contact documented
- [ ] On-call rotation established

## Sign-Off

### Development Environment
- [ ] Deployed by: _________________ Date: _________
- [ ] Verified by: _________________ Date: _________

### Production Environment
- [ ] Deployed by: _________________ Date: _________
- [ ] Verified by: _________________ Date: _________
- [ ] Approved by: _________________ Date: _________

## Notes

Use this section to document any deployment-specific notes, issues encountered, or deviations from the standard procedure:

---

**Last Updated:** [Date]
**Version:** 1.0
