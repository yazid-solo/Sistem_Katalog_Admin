@echo off
title Jalankan Akses Online Katalog
color 0A
echo Menjalankan Cloudflare Tunnel...
docker start katalog_tunnel
timeout /t 3 /nobreak >nul
echo.
echo Link Publik Anda:
docker logs katalog_tunnel 2>&1 | findstr /C:"trycloudflare.com"
echo.
pause
