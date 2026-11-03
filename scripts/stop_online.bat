@echo off
title Hentikan Akses Online Katalog
color 0C
echo Mematikan container Cloudflare Tunnel...
docker stop katalog_tunnel
echo Akses online berhasil dimatikan. Website Anda kembali ke mode lokal privat.
pause
