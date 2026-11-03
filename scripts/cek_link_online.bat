@echo off
title Link Publik Katalog Pakaian
color 0A
echo ========================================================
echo   STATUS LINK PUBLIK ONLINE (CLOUDFLARE TUNNEL)
echo ========================================================
echo.
echo Mencari link aktif dari container katalog_tunnel...
echo.

docker logs katalog_tunnel 2>&1 | findstr /C:"trycloudflare.com"

echo.
echo ========================================================
echo Tip: Anda bisa membagikan link https://...trycloudflare.com
echo ke pembeli atau membukanya di HP Anda!
echo ========================================================
pause
