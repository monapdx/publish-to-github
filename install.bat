@echo off
setlocal
title Publish to GitHub — Install

echo.
echo  ============================================
echo    Installing Publish to GitHub...
echo  ============================================
echo.
echo  This downloads what the editor needs to run.
echo  You usually only run this once (or after an update).
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [Problem] Node.js was not found.
  echo.
  echo  Install the LTS version from https://nodejs.org/
  echo  then double-click this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo  [Problem] npm was not found. Reinstall Node.js from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo  Running npm install...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo  [Problem] npm install did not finish successfully.
  echo  Read the messages above — they often explain the fix.
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================
echo    Done.
echo.
echo    Next: double-click start.bat to open the editor.
echo  ============================================
echo.
pause
endlocal
