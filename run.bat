@echo off
cd /d "%~dp0"

echo =======================================
echo     Cafe Management System Launcher     
echo =======================================
echo.

echo [1/2] Starting Django Backend Server...
start "Django Backend Server" cmd /k "cd backend-repo && echo Starting Backend Server... && python manage.py runserver"

echo [2/2] Starting Next.js Frontend Server...
start "Next.js Frontend Server" cmd /k "echo Starting Frontend Server... && npm run dev"

echo.
echo All servers are starting up.
echo Please DO NOT close the newly opened command prompt windows.
echo Once the frontend is ready, access http://localhost:3000 in your browser.
echo.
pause
