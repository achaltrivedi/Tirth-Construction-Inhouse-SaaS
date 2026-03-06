#!/bin/bash
# COLS Database Backup Script
# Usage: ./scripts/backup.sh [backup_dir]
# Can be automated via cron: 0 2 * * * /path/to/cols/scripts/backup.sh

set -euo pipefail

# Config
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/cols_backup_${TIMESTAMP}.sql.gz"

# Database config (from docker-compose)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cols_db}"
DB_USER="${DB_USER:-cols_user}"

echo "🔄 Starting COLS database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Dump and compress
if command -v docker &> /dev/null; then
  # If running via Docker
  docker exec cols-db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  # If pg_dump is available locally
  PGPASSWORD="${DB_PASSWORD:-cols_password}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Verify backup was created and has content
if [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created: $BACKUP_FILE ($SIZE)"
else
  echo "❌ Backup failed: file is empty"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Cleanup old backups
DELETED=$(find "$BACKUP_DIR" -name "cols_backup_*.sql.gz" -mtime +$RETENTION_DAYS -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "🗑️  Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"
fi

echo "✅ Backup complete"
