@echo off
chcp 65001 >nul
title Lightbulb AI

echo ========================================
echo   Lightbulb AI 启动脚本
echo ========================================
echo.

:: 获取当前脚本所在目录
set "PROJECT_DIR=%~dp0"

:: 启动后端
echo [1/2] 启动后端服务...
start "Lightbulb-AI Backend" cmd /k "cd /d %PROJECT_DIR%backend && npm run dev"

:: 等待后端启动
echo 等待后端启动...
timeout /t 3 /nobreak >nul

:: 启动前端
echo [2/2] 启动前端服务...
start "Lightbulb-AI Frontend" cmd /k "cd /d %PROJECT_DIR%frontend && npm run dev"

echo.
echo ========================================
echo   启动完成！
echo   前端: http://localhost:3000
echo   后端: http://localhost:3001
echo ========================================
echo.
echo 关闭此窗口不会停止服务
pause
