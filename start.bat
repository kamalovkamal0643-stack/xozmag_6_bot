@echo off
chcp 65001 >nul
title Hozmagazin
cd /d "%~dp0"

set "NODE_EXE=%~dp0tools\node\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
set "PATH=%~dp0tools\node;%PATH%"

"%NODE_EXE%" "%~dp0scripts\start-all.mjs"

echo.
pause
