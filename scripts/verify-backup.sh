#!/bin/bash
# COLS Backup Verification Script
# Usage: ./scripts/verify-backup.sh [backup_file]
# Tests that a backup can be fully restored to a temporary database.

set -euo pipefail

BACKUP_FILE="${1:-$(ls -t ./backups/cols_backup_*.sql.gz 2>/dev/null | head -1)}"
VERIFY_DB="cols_verify_test"
DB_USER="${DB_USER:-cols_user}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ No backup file found. Usage: ./scripts/verify-backup.sh <backup_file>"
  exit 1
fi

echo "🔄 Verifying backup: $BACKUP_FILE"

# Create temporary verification database
echo "  Creating temp database '$VERIFY_DB'..."
docker exec cols-db psql -U "$DB_USER" -d cols_db -c "DROP DATABASE IF EXISTS $VERIFY_DB;" 2>/dev/null
docker exec cols-db psql -U "$DB_USER" -d cols_db -c "CREATE DATABASE $VERIFY_DB;"

# Restore backup into temp database
echo "  Restoring backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i cols-db psql -U "$DB_USER" -d "$VERIFY_DB" > /dev/null 2>&1

# Verify tables exist
TABLE_COUNT=$(docker exec cols-db psql -U "$DB_USER" -d "$VERIFY_DB" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
TABLE_COUNT=$(echo "$TABLE_COUNT" | tr -d ' ')

if [ "$TABLE_COUNT" -ge 5 ]; then
  echo "  ✅ Tables found: $TABLE_COUNT (expected ≥5)"
else
  echo "  ❌ Only $TABLE_COUNT tables found (expected ≥5)"
  docker exec cols-db psql -U "$DB_USER" -d cols_db -c "DROP DATABASE IF EXISTS $VERIFY_DB;"
  exit 1
fi

# Verify row counts
echo "  Checking row counts..."
for table in "User" "Site" "Transaction" "Worker" "Attendance" "AuditLog"; do
  COUNT=$(docker exec cols-db psql -U "$DB_USER" -d "$VERIFY_DB" -t -c \
    "SELECT count(*) FROM \"$table\";" 2>/dev/null || echo "0")
  COUNT=$(echo "$COUNT" | tr -d ' ')
  echo "    $table: $COUNT rows"
done

# Cleanup
echo "  Cleaning up temp database..."
docker exec cols-db psql -U "$DB_USER" -d cols_db -c "DROP DATABASE IF EXISTS $VERIFY_DB;"

echo ""
echo "✅ Backup verification PASSED"
echo "  File: $BACKUP_FILE"
echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
