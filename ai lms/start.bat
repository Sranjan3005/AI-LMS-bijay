@echo off
setlocal
cd /d "%~dp0"

set PORT=8000

rem --- Chrome refuses to load ES modules from file:// (CORS), so the lessons
rem --- have to be served over http. This starts a tiny local web server.

set PY=
for %%C in (python py python3) do (
  if not defined PY (
    %%C --version >nul 2>&1 && set PY=%%C
  )
)

if not defined PY (
  echo.
  echo   Python was not found, so this script cannot start the preview server.
  echo.
  echo   Two other ways to run the lessons:
  echo     1. Open this folder in VS Code, right-click index.html,
  echo        then "Open with Live Server".
  echo     2. Install Python from https://python.org and run this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Machines That Learn
echo   ---------------------------------------------
echo   Serving this folder at http://localhost:%PORT%
echo.
echo   Your browser should open automatically.
echo   KEEP THIS WINDOW OPEN while you use the lessons.
echo   Press Ctrl+C here when you are finished.
echo.

start "" "http://localhost:%PORT%/index.html"
%PY% -m http.server %PORT%
