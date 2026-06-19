# AgroConnect dev startup — run from repo root
# Usage: .\dev-start.ps1

$root = $PSScriptRoot

Write-Host "Starting auth-service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\auth-service'; pnpm dev"

Start-Sleep -Seconds 2

Write-Host "Starting api-gateway..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\api-gateway'; pnpm dev"

Write-Host "Starting farm-service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\farm-service'; pnpm dev"

Start-Sleep -Seconds 3

Write-Host "Starting Expo Metro..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:REACT_NATIVE_PACKAGER_HOSTNAME='192.168.100.5'; cd '$root\apps\mobile'; npx expo start --host lan"

Write-Host "All services starting in separate windows." -ForegroundColor Cyan
Write-Host "Connect Expo Go to: exp://192.168.100.5:8081" -ForegroundColor Cyan
