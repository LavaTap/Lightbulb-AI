@echo off
chcp 65001 >nul
title AI 角色对话 - 启动器

echo ============================================
echo   AI 角色对话 - 一键启动
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js 版本:
node --version
echo.

:: Backend setup
echo [步骤 1] 检查后端依赖...
cd /d "%~dp0backend"

if not exist "node_modules" (
    echo [步骤 2] 安装后端依赖（首次运行）...
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [步骤 2] 后端依赖已存在，跳过安装
)
echo.

:: Frontend setup
echo [步骤 3] 检查前端依赖...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [步骤 4] 安装前端依赖（首次运行）...
    npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [步骤 4] 前端依赖已存在，跳过安装
)
echo.

:: Start backend
echo [步骤 5] 启动后端服务 (端口 3001)...
cd /d "%~dp0backend"
start "AI-Chat-Backend" cmd /k "npm run dev"

:: Wait for backend to be ready
echo [步骤 6] 等待后端服务就绪...
timeout /t 3 /nobreak >nul

:: Start frontend
echo [步骤 7] 启动前端服务 (端口 3000)...
cd /d "%~dp0frontend"
start "AI-Chat-Frontend" cmd /k "npm run dev"

:: Wait and open browser
echo [步骤 8] 等待前端服务就绪，即将打开浏览器...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   服务已启动！
echo   前端: http://localhost:3000
echo   后端: http://localhost:3001
echo ============================================
echo.

:: Open browser
start http://localhost:3000

echo 按任意键关闭此窗口（服务将继续运行）...
pause >nul
