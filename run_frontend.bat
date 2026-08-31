@echo off
echo ====================================================
echo Starting Muscle Memory Live Command Center UI...
echo ====================================================
cd /d "%~dp0\frontend"
npm.cmd run dev
pause
