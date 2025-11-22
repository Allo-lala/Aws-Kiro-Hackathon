# Database Backup Scripts

This directory contains scripts for backing up and restoring the PostgreSQL database.

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) must be installed
- Environment variables must be configured in `.env` file at project root
- Appropriate database permissions for the configured user

## Backup Script

### Usage

```bash
# Make script executable
chmod +x scripts/backup/backup-database.sh

# Run backup
./scripts/backup/backup-database.sh
```

### Configuration

The backup script uses the following environment variables:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: eco_route_planner)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password
- `BACKUP_DIR` - Backup directory (default: ./scripts/backup)
- `BACKUP_RETENTION_DAYS` - Days to keep old backups (default: 7)

### Features

- Creates compressed backups with timestamp
- Automatically removes backups older than retention period
- Displays backup size and location
- Uses custom format for faster restore

## Restore Script

### Usage

```bash
# Make script executable
chmod +x scripts/backup/restore-database.sh

# Run restore
./scripts/backup/restore-database.sh <backup_file>

# Example
./scripts/backup/restore-database.sh ./scripts/backup/backup_eco_route_planner_20231201_120000.sql.gz
```

### Features

- Confirms before restoring
- Handles compressed and uncompressed backups
- Terminates existing connections
- Recreates database before restore
- Cleans up temporary files

## Automated Backups

### Using Cron (Linux/Mac)

Add to crontab to run daily at 2 AM:

```bash
crontab -e

# Add this line:
0 2 * * * cd /path/to/project && ./scripts/backup/backup-database.sh >> /var/log/db-backup.log 2>&1
```

### Using Docker

The docker-compose.yml includes a volume mount for backups. You can run backups from within the container:

```bash
# Execute backup inside container
docker-compose exec postgres sh -c 'pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -F c | gzip > /backup/backup_$(date +%Y%m%d_%H%M%S).sql.gz'
```

## Best Practices

1. **Regular Backups**: Schedule automated backups daily or more frequently for production
2. **Off-site Storage**: Copy backups to remote storage (S3, Azure Blob, etc.)
3. **Test Restores**: Regularly test restore process to ensure backups are valid
4. **Monitor Disk Space**: Ensure backup directory has sufficient space
5. **Secure Backups**: Encrypt backups containing sensitive data
6. **Document Recovery**: Keep recovery procedures documented and accessible

## Troubleshooting

### Permission Denied

```bash
chmod +x scripts/backup/*.sh
```

### Connection Refused

Check that PostgreSQL is running and environment variables are correct:

```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

### Out of Disk Space

Check available space and clean old backups:

```bash
df -h
find ./scripts/backup -name "*.sql.gz" -mtime +30 -delete
```
