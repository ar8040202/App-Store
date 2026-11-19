@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Aseel Store

rem Port comes from settings.py (or from the PORT environment variable).
for /f %%p in ('python -c "from settings import PORT; print(PORT)"') do set "PORT=%%p"
if not defined PORT set PORT=8050

rem If the server is already running, just open the browser.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%PORT%/api/health -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto :open

echo.
echo   Starting Aseel Store...
echo.
start "Aseel Server" cmd /k python run.py
ping -n 6 127.0.0.1 >nul

:open
start "" http://127.0.0.1:%PORT%/
exit /b 0
