@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-desktop-shortcut.ps1"
pause
