@echo off
setlocal
title Publish to GitHub — Editor

echo.
echo  ============================================
echo    Opening the editor...
echo  ============================================
echo.
echo  Keep this window open while you write.
echo  Closing it stops the local editor.
echo  Your browser should open automatically.
echo  If it does not, look below for a line starting with http://localhost
echo  (the number after localhost may vary if 5173 is already in use).
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [Problem] Node.js was not found.
  echo  Install Node from https://nodejs.org/ then run install.bat.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  [Problem] This folder is missing the "node_modules" directory.
  echo  Double-click install.bat first and wait until it finishes.
  echo.
  pause
  exit /b 1
)

echo  Starting the local server...
echo.
call npm run dev
if errorlevel 1 (
  echo.
  echo  [Problem] The server stopped with an error. See messages above.
  echo.
  pause
  exit /b 1
)

echo.
pause
endlocal
