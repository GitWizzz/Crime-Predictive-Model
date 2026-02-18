param(
  [string]$BackendPort = "4000",
  [string]$FrontendPort = "3000",
  [string]$MlPort = "8001",
  [string]$DbHost = "localhost",
  [string]$DbPort = "5432",
  [string]$DbUser = "postgres",
  [string]$DbName = "crime_db",
  [string]$CorsOrigin = "http://localhost:3000",
  [string]$ApiBase = "http://localhost:4000",
  [string]$MlServiceUrl = "http://localhost:8001",
  [switch]$SkipML
)

if (-not $env:DB_PASSWORD) {
  $env:DB_PASSWORD = Read-Host "Enter DB_PASSWORD"
}
if (-not $env:JWT_SECRET) {
  $env:JWT_SECRET = Read-Host "Enter JWT_SECRET"
}

$env:PORT = $BackendPort
$env:DB_HOST = $DbHost
$env:DB_PORT = $DbPort
$env:DB_USER = $DbUser
$env:DB_NAME = $DbName
$env:JWT_EXPIRES_IN = "8h"
$env:ML_SERVICE_URL = $MlServiceUrl
$env:CORS_ORIGIN = $CorsOrigin
$env:NEXT_PUBLIC_API_BASE = $ApiBase

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

if (-not $SkipML) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ml-service; if (Test-Path .\\.venv\\Scripts\\Activate.ps1) { . .\\.venv\\Scripts\\Activate.ps1 } else { Write-Host 'Missing ml-service/.venv. Create it first if needed.' }; uvicorn app.main:app --host 0.0.0.0 --port $MlPort"
}