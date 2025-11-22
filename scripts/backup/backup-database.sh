#!/bin/bash
# Database Backup Script
# This script creates a backup of the PostgreSQL database

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./scripts/backup}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-eco_route_planner}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup..."
echo "Database: ${DB_NAME}"
echo "Timestamp: ${TIMESTAMP}"

# Create backup
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -F c \
    -f "${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup created: ${BACKUP_FILE}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "backup_${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup completed successfully!"
