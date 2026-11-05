@echo off
chcp 65001 >nul
title Journall - Update to Latest Version
echo ==========================================================
echo  Journall - Update to the Latest Version
echo ==========================================================
echo.
echo This downloads the newest local-server.ps1, mt5_sync.py,
echo Fix-MT5-Sync.bat and index.html directly from your GitHub
echo repo so you do not have to do anything manually.
echo.
echo Keep this window open until it says DONE.
echo.

cd /d "%~dp0"

rem --- Download the latest bridge files directly from GitHub ---
echo [1/4] Downloading local-server.ps1 ...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/KavyaBaghel/Trading-Journal/main/local-server.ps1' -OutFile 'local-server.ps1'"

echo [2/4] Downloading mt5_sync.py ...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/KavyaBaghel/Trading-Journal/main/mt5_sync.py' -OutFile 'mt5_sync.py'"

echo [3/4] Downloading Fix-MT5-Sync.bat ...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/KavyaBaghel/Trading-Journal/main/Fix-MT5-Sync.bat' -OutFile 'Fix-MT5-Sync.bat'"

echo [4/4] Downloading index.html ...
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/KavyaBaghel/Trading-Journal/main/index.html' -OutFile 'index.html'"

if not exist "local-server.ps1" (
    echo.
    echo ERROR: local-server.ps1 was not downloaded. Check your
    echo internet connection and try again.
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo  DONE - Your local files are now the latest version.
echo ==========================================================
echo.
echo Next steps:
echo  1. Double-click Fix-MT5-Sync.bat to install the Python
echo     packages (MetaTrader5 + numpy).
echo  2. Then double-click Journall App.bat.
echo  3. Open http://localhost:8787/index.html and sync.
echo.
pause
