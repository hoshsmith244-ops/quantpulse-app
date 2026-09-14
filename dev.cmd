@echo off
REM Launches the QuantPulse dev server with the portable Node runtime on PATH.
set "PATH=C:\Users\Joshua\AppData\Local\nodejs-portable\node-v24.21.0-win-x64;%PATH%"
cd /d "%~dp0"
call npm run dev %*
