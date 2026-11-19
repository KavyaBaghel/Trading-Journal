@echo off
chcp 65001 >nul
title Journall - MT5 Sync Fix
echo ==========================================================
echo  Journall - MT5 Sync Self-Repair
echo ==========================================================
echo.
echo This installs the MetaTrader5 + numpy Python packages so
echo that "Sync from MetaTrader 5" works. Keep this window open
echo until it says DONE or shows a fix instruction.
echo.

set "PYEXE="
rem --- Try the Windows Py launcher with newest versions first ---
py -3.13 -c "print('ok')" >nul 2>&1 && set "PYEXE=py -3.13"
if not defined PYEXE py -3.12 -c "print('ok')" >nul 2>&1 && set "PYEXE=py -3.12"
if not defined PYEXE py -3.11 -c "print('ok')" >nul 2>&1 && set "PYEXE=py -3.11"
if not defined PYEXE py -3 -c "print('ok')" >nul 2>&1 && set "PYEXE=py -3"

rem --- Fall back to plain 'python' / 'py' in PATH ---
if not defined PYEXE python -c "print('ok')" >nul 2>&1 && set "PYEXE=python"
if not defined PYEXE py -c "print('ok')" >nul 2>&1 && set "PYEXE=py"

if not defined PYEXE (
    echo [STEP 1] Python was NOT found on this PC.
    echo.
    echo FIX: Install Python from https://www.python.org/downloads/
    echo      On the installer screen, tick "Add python.exe to PATH"
    echo      then click Install Now. After installing, run this
    echo      file again.
    pause
    exit /b 1
)

echo [STEP 1] Python found: %PYEXE%
echo [STEP 2] Upgrading pip and installing MetaTrader5 + numpy...
echo          (this may take 1-3 minutes, please wait)
echo.

%PYEXE% -m pip install --upgrade --user pip >nul 2>&1
%PYEXE% -m pip install --user --force-reinstall --no-cache-dir MetaTrader5 numpy > "%TEMP%\journall_mt5_install.log" 2>&1

if errorlevel 1 (
    echo [STEP 2] Automatic install failed. Full log saved to:
    echo   %TEMP%\journall_mt5_install.log
    echo.
    echo FIX: Open PowerShell and run:
    echo   %PYEXE% -m pip install --user --force-reinstall --no-cache-dir MetaTrader5 numpy
    echo.
    echo If that also fails, your PC may block downloads. In that
    echo case use the "Upload MT5 HTML Report" button in Journall
    echo instead (in MT5: right-click in the History tab - Report -
    echo HTML, then upload that file on the Upload Data page).
    pause
    exit /b 1
)

echo [STEP 3] Verifying the installation...
%PYEXE% -c "import MetaTrader5, numpy; print('import ok')" > "%TEMP%\journall_mt5_verify.log" 2>&1

if errorlevel 1 (
    echo [STEP 3] Package installed but could not be imported. Log:
    echo   %TEMP%\journall_mt5_verify.log
    echo.
    echo FIX: The MetaTrader5 package works ONLY with 64-bit Python
    echo 3.8+ on Windows. If you have 32-bit Python or a very old
    echo version, reinstall Python 3.12 (64-bit) from
    echo https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo  DONE - MetaTrader5 package is installed and working.
echo ==========================================================
echo.
echo Next steps:
echo  1. Make sure the MetaTrader 5 terminal is open and logged in.
echo  2. Double-click Journall App.bat to start the bridge.
echo  3. Open http://localhost:8787/index.html and click
echo     "Sync from MetaTrader 5".
echo.
pause
