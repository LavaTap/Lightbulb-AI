@echo off
chcp 65001 >nul
title Lightbulb AI - 停止服务

echo ========================================
echo   停止 Lightbulb AI 服务
echo ========================================
echo.

:: 关闭前端
echo 关闭前端服务...
taskkill /f /fi "windowtitle eq Lightbulb-AI Frontend*" >nul 2>&1

:: 关闭后端
echo 关闭后端服务...
taskkill /f /fi "windowtitle eq Lightbulb-AI Backend*" >nul 2>&1

echo.
echo 所有服务已停止！
pause
