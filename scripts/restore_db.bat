@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   DLRS KATALOG - RESTORE DATABASE POSTGRESQL
echo ===================================================

cd /d "%~dp0.."

if "%~1"=="" (
    echo Penggunaan:
    echo   scripts\restore_db.bat backups\backup_katalog_YYYYMMDD_HHMMSS.sql
    echo.
    echo Daftar file backup yang tersedia:
    dir /b backups\*.sql 2>nul
    echo.
    pause
    exit /b 1
)

set RESTORE_FILE=%~1

if not exist "%RESTORE_FILE%" (
    echo [ERROR] File backup "%RESTORE_FILE%" tidak ditemukan!
    pause
    exit /b 1
)

echo PERINGATAN: Memulihkan database akan menimpa data yang ada saat ini.
set /p CONFIRM="Ketik Y untuk melanjutkan: "
if /i not "%CONFIRM%"=="Y" (
    echo Pemulihan dibatalkan.
    pause
    exit /b 0
)

echo [1/2] Memulihkan database dari %RESTORE_FILE%...
docker exec -i katalog_db psql -U katalog_user -d katalog_pakaian < "%RESTORE_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo [2/2] Sukses! Database berhasil dipulihkan.
) else (
    echo [ERROR] Terjadi kegagalan saat proses pemulihan.
)

pause
