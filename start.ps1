#!/usr/bin/env pwsh
# Start Safety Officer Web Server

Write-Host "`n🔄 Starting Safety Officer Server..." -ForegroundColor Cyan

# Kill any existing node processes
Write-Host "Checking for existing node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Start the server
Write-Host "`n🚀 Starting web server..." -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop the server`n" -ForegroundColor Gray

node src/web-server.js
