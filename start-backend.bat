@echo off
echo Starting BRD Generation API Backend...
echo.
cd /d "%~dp0"
uvicorn api.main:app --reload --port 8000
pause
