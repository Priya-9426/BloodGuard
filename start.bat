@echo off
title BloodGuard Launch Controller
echo ========================================================
echo    ?? Starting BloodGuard Emergency Platform...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Python ML Anomaly Detection Service (Port 5001)...
start "BloodGuard ML Microservice" /min "%~dp0.venv\Scripts\python.exe" -m uvicorn fraud_detector:app --app-dir "%~dp0src\backend\ml" --host 127.0.0.1 --port 5001

timeout /t 2 /nobreak >nul

echo [2/3] Starting Node Express Backend API (Port 4000)...
start "BloodGuard Backend Server" /min node "%~dp0src\backend\server.js"

timeout /t 2 /nobreak >nul

echo [3/3] Opening BloodGuard Web Application (Port 3000)...
echo.
echo ========================================================
echo   ? BloodGuard is LIVE!
echo   ?? Browser opening: http://localhost:3000
echo   ?? Admin: admin@bloodguard.health / Admin@123456
echo ========================================================
echo.

start http://localhost:3000

node "%~dp0server.js"
