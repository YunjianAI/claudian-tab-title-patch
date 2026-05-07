@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js not found. Download: https://nodejs.org
    pause
    exit /b 1
)
node "%~dp0patch-claudian-tabs.js" "."
echo.
pause
