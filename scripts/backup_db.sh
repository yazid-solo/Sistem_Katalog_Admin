#!/usr/bin/env bash
# ===================================================
#   DLRS KATALOG - BACKUP DATABASE POSTGRESQL (LINUX / VPS)
#   Bisa dijalankan manual atau via crontab (cron job berkala)
# ===================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

mkdir -p backups

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/backup_katalog_${TIMESTAMP}.sql"

echo "[1/3] Membuat dump PostgreSQL dari kontainer katalog_db..."
docker exec katalog_db pg_dump -U katalog_user -d katalog_pakaian > "$BACKUP_FILE"

echo "[2/3] Mengompres file backup ke format gzip (.gz)..."
gzip -f "$BACKUP_FILE"
FINAL_FILE="${BACKUP_FILE}.gz"

echo "[3/3] Menghapus backup lama yang lebih dari 30 hari..."
find backups/ -name "backup_katalog_*.sql.gz" -mtime +30 -delete

FILE_SIZE=$(ls -lh "$FINAL_FILE" | awk '{print $5}')
echo "==================================================="
echo "✓ Backup Berhasil: $FINAL_FILE (Ukuran: $FILE_SIZE)"
echo "==================================================="
