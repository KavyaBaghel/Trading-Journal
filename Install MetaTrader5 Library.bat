@echo off
title Install MetaTrader5 Python Package
echo Installing MetaTrader5 library for Python...
python -m pip install --user MetaTrader5
if %ERRORLEVEL% NEQ 0 (
  py -m pip install --user MetaTrader5
)
echo.
echo Setup complete! You can now use Auto Broker Sync in Journall.
pause
