@echo off
echo ===================================================
echo   OMNIA CREATA STUDIO - Development Environment
echo ===================================================
echo.
echo Starting Backend (FastAPI)...
start "Omnia Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Frontend (Vite)...
start "Omnia Frontend" cmd /k "cd web && npm run dev"

echo.
echo Development servers are starting in separate windows!
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:8000
echo.
echo You can safely close Antigravity; these servers will remain running.
echo To shut them down, close their respective terminal windows.
echo ===================================================
