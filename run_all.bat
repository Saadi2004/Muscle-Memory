@echo off
echo ====================================================
echo Launching Muscle Memory Full Stack System...
echo ====================================================
start "Muscle Memory Backend API" cmd /k "cd /d "%~dp0" && .venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"
start "Muscle Memory Frontend Dashboard" cmd /k "cd /d "%~dp0\frontend" && npm.cmd run dev"
echo Backend running at http://localhost:8000
echo Frontend running at http://localhost:5173
