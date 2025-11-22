#!/bin/bash
# Database Restore Script
# This script restores a PostgreSQL database from a backup file

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-eco_route_planner}"
DB_USER="${DB_USER:-postgres}"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 ./scripts/backup/backup_eco_route_planner_20231201_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "WARNING: This will restore the database from backup."
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting database restore..."

# Decompress if needed
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    echo "Decompressing backup file..."
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "${BACKUP_FILE}" > "${TEMP_FILE}"
    BACKUP_FILE="${TEMP_FILE}"
    CLEANUP_TEMP=true
fi

# Drop existing connections
echo "Terminating existing connections..."
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Recreating database..."
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};"

PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "CREATE DATABASE ${DB_NAME};"

# Restore backup
echo "Restoring backup..."
PGPASSWORD="${DB_PASSWORD}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -v \
    "${BACKUP_FILE}"

# Cleanup temporary file if created
if [ "${CLEANUP_TEMP}" = true ]; then
    rm -f "${BACKUP_FILE}"
fi

echo "Database restore completed successfully!"
