@echo off
title Lightbulb AI
cd /d "%~dp0"

echo ========================================
echo   Lightbulb AI 启动脚本
echo ========================================
echo.

:: 启动后端
echo [1/2] 启动后端服务...
start "Lightbulb-Backend" cmd /k "cd /d %~dp0backend && npm run dev"

:: 等待后端启动
timeout /t 3 /nobreak > nul

:: 启动前端
echo [2/2] 启动前端服务...
start "Lightbulb-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   服务已启动！
echo   后端: http://localhost:3001
echo   前端: http://localhost:3000
echo ========================================
echo.
echo 关闭此窗口不会停止服务
pause
