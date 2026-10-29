#!/usr/bin/env bash
# ===================================================
#   DLRS KATALOG - RESTORE DATABASE POSTGRESQL (LINUX)
# ===================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

RESTORE_FILE="$1"

if [ -z "$RESTORE_FILE" ]; then
    echo "Penggunaan: ./scripts/restore_db.sh backups/backup_katalog_YYYYMMDD_HHMMSS.sql[.gz]"
    echo ""
    echo "Daftar file backup:"
    ls -lh backups/ 2>/dev/null || echo "Belum ada file backup di folder backups/"
    exit 1
fi

if [ ! -f "$RESTORE_FILE" ]; then
    echo "[ERROR] File $RESTORE_FILE tidak ditemukan!"
    exit 1
fi

read -p "PERINGATAN: Memulihkan database akan menimpa data yang ada. Lanjutkan? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Dibatalkan."
    exit 0
fi

if [[ "$RESTORE_FILE" == *.gz ]]; then
    echo "[1/2] Memulihkan dari file terkompresi (.gz)..."
    gunzip -c "$RESTORE_FILE" | docker exec -i katalog_db psql -U katalog_user -d katalog_pakaian
else
    echo "[1/2] Memulihkan dari file .sql..."
    cat "$RESTORE_FILE" | docker exec -i katalog_db psql -U katalog_user -d katalog_pakaian
fi

echo "[2/2] Sukses! Database berhasil dipulihkan."
