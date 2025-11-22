# Deployment and Maintenance Scripts

This directory contains scripts for deploying and maintaining the Eco-Friendly Route Planner application.

## Scripts Overview

### Deployment Script (`deploy.sh`)

Main deployment script for managing the application lifecycle.

**Usage:**
```bash
# Development deployment
./scripts/deploy.sh dev

# Production deployment
./scripts/deploy.sh prod

# Stop services
./scripts/deploy.sh stop          # Development
./scripts/deploy.sh stop prod     # Production

# Check status
./scripts/deploy.sh status        # Development
./scripts/deploy.sh status prod   # Production
```

**Features:**
- Validates environment configuration
- Checks Docker and Docker Compose installation
- Builds and starts services
- Performs health checks
- Provides clear status feedback

### Database Backup Scripts (`backup/`)

Scripts for backing up and restoring the PostgreSQL database.

**Backup:**
```bash
./scripts/backup/backup-database.sh
```

**Restore:**
```bash
./scripts/backup/restore-database.sh <backup_file>
```

See [backup/README.md](backup/README.md) for detailed documentation.

## Prerequisites

All scripts require:
- Bash shell
- Docker and Docker Compose installed
- `.env` file configured at project root
- Appropriate permissions (scripts are executable)

## Making Scripts Executable

If scripts are not executable, run:
```bash
chmod +x scripts/deploy.sh
chmod +x scripts/backup/*.sh
```

## Environment Variables

Scripts use environment variables from `.env` file. Ensure the following are set:

**Required:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `SESSION_SECRET`
- API keys for external services

**Optional:**
- `BACKUP_DIR` - Backup directory location
- `BACKUP_RETENTION_DAYS` - Days to keep old backups
- `LOG_LEVEL` - Application log level

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/*.sh
chmod +x scripts/backup/*.sh
```

### Docker Not Found

Install Docker:
- **Linux:** `curl -fsSL https://get.docker.com | sh`
- **Mac:** Download from https://www.docker.com/products/docker-desktop
- **Windows:** Download from https://www.docker.com/products/docker-desktop

### Environment File Missing

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Best Practices

1. **Always test in development first** before deploying to production
2. **Backup database** before major updates or migrations
3. **Review logs** after deployment to ensure services are healthy
4. **Monitor health endpoints** to verify system status
5. **Keep scripts updated** with application changes

## Additional Resources

- [Deployment Guide](../DEPLOYMENT_GUIDE.md) - Comprehensive deployment documentation
- [Database Backup README](backup/README.md) - Database backup and restore guide
- [Docker Documentation](https://docs.docker.com/) - Docker reference
