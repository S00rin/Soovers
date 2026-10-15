@echo off
setlocal
cd /d "%~dp0"
set "SOOVERS_NODE=node"
where node >nul 2>&1
if errorlevel 1 (
  set "SOOVERS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not "%SOOVERS_NODE%"=="node" if not exist "%SOOVERS_NODE%" (
  echo Node.js 24 or newer is required. Install Node.js, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
"%SOOVERS_NODE%" run.mjs --open
pause
