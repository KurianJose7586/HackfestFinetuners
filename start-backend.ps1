Write-Host "Starting BRD Generation API Backend..." -ForegroundColor Green
Write-Host ""
Set-Location $PSScriptRoot
uvicorn api.main:app --reload --port 8000
