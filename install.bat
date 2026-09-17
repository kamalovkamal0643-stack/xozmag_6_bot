@echo off
chcp 65001 >nul
title Hozmagazin - paketlarni qayta o'rnatish
cd /d "%~dp0"

set "PATH=%~dp0tools\node;%PATH%"

echo.
echo Bu fayl faqat biror narsa buzilsa kerak bo'ladi. Odatda start.bat yetarli.
echo.

cd /d "%~dp0backend"
call npm install --no-fund --no-audit
if errorlevel 1 goto :error

cd /d "%~dp0miniapp"
call npm install --no-fund --no-audit
if errorlevel 1 goto :error

cd /d "%~dp0admin"
call npm install --no-fund --no-audit
if errorlevel 1 goto :error

echo.
echo TAYYOR. Endi start.bat ni ishga tushiring.
pause
exit /b 0

:error
echo.
echo XATO: yuqoridagi xabarni o'qing.
pause
exit /b 1
