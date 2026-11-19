@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Aseel Store - Mobile

set HOST=0.0.0.0

rem Port comes from settings.py (or from the PORT environment variable).
for /f %%p in ('python -c "from settings import PORT; print(PORT)"') do set "PORT=%%p"
if not defined PORT set PORT=8050

echo.
echo   Aseel Store - LAN mode (phone on the same Wi-Fi)
echo.
echo   Open this address from your phone:
for /f %%a in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } ^| Select-Object -First 1).IPAddress"') do echo       http://%%a:%PORT%
echo.
echo   Note: allow Python through Windows Firewall when prompted.
echo.

start "Aseel Server (LAN)" cmd /k python run.py
ping -n 6 127.0.0.1 >nul
exit /b 0
