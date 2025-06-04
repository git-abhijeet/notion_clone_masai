@echo off
REM Batch script to clear Pinecone database
REM Usage: scripts\clear-pinecone.bat [options]

setlocal enabledelayedexpansion

REM Colors (using PowerShell for colored output)
set "red=[31m"
set "green=[32m"
set "yellow=[33m"
set "blue=[34m"
set "cyan=[36m"
set "reset=[0m"

echo.
echo %cyan%🗑️  Pinecone Database Clear Script%reset%
echo %cyan%=====================================%reset%
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo %red%❌ Node.js not found. Please install Node.js first.%reset%
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo %red%❌ package.json not found. Please run from project root.%reset%
    pause
    exit /b 1
)

REM Check if the script exists
if not exist "scripts\clear-pinecone-db.js" (
    echo %red%❌ clear-pinecone-db.js script not found.%reset%
    pause
    exit /b 1
)

REM Check for command line arguments
set "args="
if "%1"=="--force" set "args=--force"
if "%1"=="--dry-run" set "args=--dry-run"
if "%1"=="--help" set "args=--help"
if "%2"=="--force" set "args=%args% --force"
if "%2"=="--dry-run" set "args=%args% --dry-run"

REM Show warning for destructive operations
if not "%args%"=="--help" if not "%args%"=="--dry-run" if not "%args%"=="--force" (
    echo %yellow%⚠️  WARNING: This will delete ALL vectors from Pinecone!%reset%
    echo %red%This action CANNOT be undone!%reset%
    echo.
    set /p "confirm=Are you sure? Type YES to continue: "
    if not "!confirm!"=="YES" (
        echo %yellow%Operation cancelled.%reset%
        pause
        exit /b 0
    )
)

echo %cyan%🚀 Running Pinecone clear script...%reset%
echo.

REM Execute the Node.js script
if "%args%"=="" (
    node scripts\clear-pinecone-db.js --confirm
) else (
    node scripts\clear-pinecone-db.js %args%
)

REM Check exit code
if errorlevel 1 (
    echo.
    echo %red%❌ Script failed. Check the output above for details.%reset%
) else (
    echo.
    echo %green%✅ Script completed successfully!%reset%
)

echo.
pause
