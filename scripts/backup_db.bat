@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   DLRS KATALOG - BACKUP DATABASE POSTGRESQL
echo ===================================================

cd /d "%~dp0.."
if not exist "backups" mkdir "backups"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=backups\backup_katalog_%TIMESTAMP%.sql

echo [1/2] Membuat cadangan database dari kontainer Docker katalog_db...
docker exec katalog_db pg_dump -U katalog_user -d katalog_pakaian > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [2/2] Sukses! File cadangan berhasil dibuat:
    echo        %BACKUP_FILE%
    for %%A in ("%BACKUP_FILE%") do echo        Ukuran file: %%~zA bytes
    echo ===================================================
    echo   Backup selesai dengan aman.
    echo ===================================================
) else (
    echo [ERROR] Gagal membuat backup database. Pastikan Docker Desktop sedang berjalan!
    echo ===================================================
)

pause
