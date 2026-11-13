@echo off
title Nayak's Sujay Billing Platform
echo ===================================================
echo   NAYAK'S SUJAY - HOTEL BILLING & GST SYSTEM
echo   Experience the Divine Comfort
echo ===================================================
echo Starting application server...

cd /d "%~dp0"
start "" /b python run.py
timeout /t 2 >nul

echo Opening Billing Workspace in browser...
start http://127.0.0.1:5000/

echo.
echo Application is running at http://127.0.0.1:5000/
echo To stop, close this window or terminate the Python process.
echo ===================================================
pause
