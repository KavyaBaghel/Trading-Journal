@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-chrome-shortcut.ps1"
pause
