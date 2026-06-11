@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-chrome-app.ps1"
pause
