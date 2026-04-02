@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

where npm >nul 2>nul
if errorlevel 1 (
  echo [shahmatka] npm not found in PATH.
  echo Install Node.js and reopen the terminal, then run this file again.
  pause
  exit /b 1
)

echo [shahmatka] Stopping old listeners on ports 3001 and 5173 if they exist...
for %%P in (3001 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
    taskkill /PID %%I /F >nul 2>nul
  )
)

echo [shahmatka] Starting API...
start "Shahmatka API" cmd /k "cd /d "%ROOT%" && npm run dev --workspace @hotel-crm/api"

echo [shahmatka] Starting Web...
start "Shahmatka Web" cmd /k "cd /d "%ROOT%" && npm run dev --workspace @hotel-crm/web -- --host 127.0.0.1 --port 5173"

echo [shahmatka] Waiting for services...
timeout /t 8 /nobreak >nul

start "" "http://127.0.0.1:5173/login"

echo [shahmatka] Web: http://127.0.0.1:5173/login
echo [shahmatka] API: http://127.0.0.1:3001/health
echo [shahmatka] Two windows were opened with live logs.

endlocal

