@echo off
setlocal EnableDelayedExpansion

REM =====================================================
REM  CURRY CLUB — ONE-CLICK PUBLISH
REM  Double-click this file to push local changes to the
REM  live site. GitHub Pages redeploys within 1-2 minutes.
REM =====================================================

REM Run from the folder this script lives in
cd /d "%~dp0"

REM Make sure git is on PATH (same trick as HOW-TO-UPDATE.txt)
where git >nul 2>&1
if errorlevel 1 (
  set "PATH=%PATH%;C:\Program Files\Git\cmd"
  where git >nul 2>&1
  if errorlevel 1 (
    echo.
    echo [ERROR] Git not found on this machine.
    echo Install Git for Windows from https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo   Curry Club Publisher
echo ============================================
echo.

REM Any changes to push?
set HAS_CHANGES=
for /f "delims=" %%i in ('git status --porcelain') do set HAS_CHANGES=1

if not defined HAS_CHANGES (
  echo Nothing to publish - working tree is already clean.
  echo.
  echo If you expected changes, make sure you replaced data.js
  echo with the one you downloaded from the website.
  echo.
  pause
  exit /b 0
)

echo Changes to publish:
echo --------------------------------------------
git status --short
echo --------------------------------------------
echo.

REM Default commit message with today's date
for /f "tokens=1-3 delims=/" %%a in ('echo %date%') do (
  set DAY=%%a
  set MONTH=%%b
  set YEAR=%%c
)
set DEFAULT_MSG=Update curry club entries - %date%

set /p MESSAGE="Commit message (press Enter for '%DEFAULT_MSG%'): "
if "!MESSAGE!"=="" set "MESSAGE=%DEFAULT_MSG%"

echo.
echo Staging changes...
git add -A
if errorlevel 1 goto FAIL

echo Committing...
git commit -m "!MESSAGE!"
if errorlevel 1 goto FAIL

echo Pushing to GitHub...
git push
if errorlevel 1 goto FAIL

echo.
echo ============================================
echo   [SUCCESS] Published!
echo ============================================
echo.
echo Live site will update in 1-2 minutes:
echo   https://lockstock1.github.io/necurryclub/
echo.
pause
exit /b 0

:FAIL
echo.
echo ============================================
echo   [ERROR] Something went wrong
echo ============================================
echo.
echo Common causes:
echo   - Network issue: check your internet connection
echo   - Someone else pushed first: run 'git pull' then try again
echo   - Credentials expired: push once from VS Code to refresh them
echo.
pause
exit /b 1
