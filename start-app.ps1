param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Title($message) {
  Write-Host ""
  Write-Host "== $message ==" -ForegroundColor Cyan
}

function Write-Ok($message) {
  Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Fail($message) {
  Write-Host "[STOP] $message" -ForegroundColor Red
}

function Test-CommandExists($name) {
  $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Get-NodeVersion {
  $raw = (& node -v).Trim()
  if ($raw -notmatch "^v(\d+)\.(\d+)\.(\d+)") {
    throw "Could not read Node.js version from '$raw'."
  }

  return [pscustomobject]@{
    Major = [int]$Matches[1]
    Minor = [int]$Matches[2]
    Patch = [int]$Matches[3]
    Raw = $raw
  }
}

function Test-PortInUse($port) {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
    $listener.Start()
    return $false
  } catch {
    return $true
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Test-BackendHealth {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 2
    return $response.status -eq "ok"
  } catch {
    return $false
  }
}

function Get-BackendDeepHealth {
  try {
    return Invoke-RestMethod -Uri "http://localhost:4000/health/deep" -TimeoutSec 3
  } catch {
    return $null
  }
}

function Ensure-EnvFile($examplePath, $targetPath) {
  if (!(Test-Path $targetPath)) {
    Copy-Item $examplePath $targetPath
    Write-Ok "Created $targetPath from $examplePath"
  } else {
    Write-Ok "$targetPath exists"
  }
}

function Read-EnvValue($path, $key, $fallback) {
  if (!(Test-Path $path)) {
    return $fallback
  }

  $match = Get-Content $path | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (!$match) {
    return $fallback
  }

  return ($match -replace "^$key=", "").Trim()
}

function Set-EnvValue($path, $key, $value) {
  if (!(Test-Path $path)) {
    Set-Content $path "$key=$value"
    return
  }

  $lines = Get-Content $path
  $found = $false
  $nextLines = $lines | ForEach-Object {
    if ($_ -match "^$key=") {
      $found = $true
      "$key=$value"
    } else {
      $_
    }
  }

  if ($found) {
    Set-Content $path $nextLines
  } else {
    Add-Content $path "$key=$value"
  }
}

function Test-DockerEngineReady {
  if (!(Test-CommandExists "docker")) {
    return $false
  }

  & docker info *> $null
  return $LASTEXITCODE -eq 0
}

function Invoke-Npm($arguments, $description) {
  Write-Title $description
  & npm @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$description failed."
  }
}

function Test-PrismaClientReady {
  return (Test-Path "backend\node_modules\.prisma\client\index.js") -and
    (Test-Path "backend\node_modules\.prisma\client\query_engine-windows.dll.node")
}

Write-Title "NutriTrack Pro local startup"
Write-Host "This script checks your computer, prepares the local data mode, and starts the frontend plus backend."

Write-Title "Checking required tools"
if (!(Test-CommandExists "node")) {
  Write-Fail "Node.js is missing. Install Node.js 20 LTS or newer, then run this script again."
  exit 1
}

if (!(Test-CommandExists "npm")) {
  Write-Fail "npm is missing. Reinstall Node.js with npm selected."
  exit 1
}

$nodeVersion = Get-NodeVersion
if ($nodeVersion.Major -lt 20 -or ($nodeVersion.Major -eq 20 -and $nodeVersion.Minor -lt 19)) {
  Write-Fail "Node.js 20.19.0 or newer is required by Vite. Current version: $($nodeVersion.Raw)"
  exit 1
}
Write-Ok "Node.js $($nodeVersion.Raw)"
Write-Ok "npm $(& npm -v)"

if (!(Test-Path "package.json") -or !(Test-Path "backend\package.json")) {
  Write-Fail "Run this script from the project root. Expected package.json and backend\package.json."
  exit 1
}
Write-Ok "Project files found"

Write-Title "Preparing environment files"
if (!(Test-Path ".env")) {
  Set-Content ".env" "VITE_API_BASE_URL=http://localhost:4000/api/v1"
  Write-Ok "Created frontend .env for local development"
}

if (!(Test-Path "backend\.env")) {
  @(
    "NODE_ENV=development",
    "APP_ENV=development",
    "PORT=4000",
    "APP_ORIGIN=http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081",
    "LOCAL_BACKEND_MODE=force_local",
    "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/caloriedb?schema=public",
    "REDIS_URL=redis://localhost:6379",
    "JWT_ACCESS_SECRET=local-development-access-secret",
    "JWT_REFRESH_SECRET=local-development-refresh-secret",
    "JWT_ACCESS_TTL=15m",
    "JWT_REFRESH_TTL=30d",
    "PASSWORD_RESET_BASE_URL=http://localhost:8080",
    "PASSWORD_RESET_TTL_MINUTES=30",
    "OTP_EXPIRY_MINUTES=10",
    "OTP_RESEND_COOLDOWN_SECONDS=60",
    "OTP_MAX_RESENDS=3",
    "OTP_MAX_VERIFY_ATTEMPTS=5",
    "OPENAI_API_KEY=",
    "OPENAI_MODEL=gpt-4.1-mini",
    "USDA_API_KEY=",
    "USDA_BASE_URL=https://api.nal.usda.gov/fdc/v1",
    "OPEN_FOOD_FACTS_BASE_URL=https://world.openfoodfacts.org",
    "OPEN_FOOD_FACTS_USER_AGENT=BiteBalance/0.1 (local-dev@example.com)",
    "REMINDER_QUEUE_NAME=reminders",
    "LOG_LEVEL=info"
  ) | Set-Content "backend\.env"
  Write-Ok "Created backend .env for local development"
}

$backendEnv = "backend\.env"
if (!(Select-String -Path $backendEnv -Pattern "^LOCAL_BACKEND_MODE=" -Quiet)) {
  Add-Content $backendEnv "LOCAL_BACKEND_MODE=force_local"
  Write-Ok "Added LOCAL_BACKEND_MODE=force_local to backend\.env"
}

if (!(Select-String -Path $backendEnv -Pattern "^USDA_API_KEY=" -Quiet)) {
  Add-Content $backendEnv "USDA_API_KEY="
  Add-Content $backendEnv "USDA_BASE_URL=https://api.nal.usda.gov/fdc/v1"
  Write-Ok "Added USDA API key setting to backend\.env"
}

foreach ($smtpLine in @(
  "OTP_EXPIRY_MINUTES=10",
  "OTP_RESEND_COOLDOWN_SECONDS=60",
  "OTP_MAX_RESENDS=3",
  "OTP_MAX_VERIFY_ATTEMPTS=5",
  "SMTP_PROVIDER=custom",
  "SMTP_SES_REGION=",
  "SMTP_HOST=",
  "SMTP_PORT=",
  "SMTP_SECURE=false",
  "SMTP_REQUIRE_TLS=true",
  "SMTP_USER=",
  "SMTP_PASSWORD=",
  "SMTP_FROM="
)) {
  $smtpKey = ($smtpLine -split "=", 2)[0]
  if (!(Select-String -Path $backendEnv -Pattern "^$smtpKey=" -Quiet)) {
    Add-Content $backendEnv $smtpLine
  }
}

$dockerReady = Test-DockerEngineReady
$localMode = Read-EnvValue $backendEnv "LOCAL_BACKEND_MODE" "force_local"

if ($dockerReady -and $localMode -eq "force_local") {
  Set-EnvValue $backendEnv "LOCAL_BACKEND_MODE" "database"
  $localMode = "database"
  Write-Ok "Docker is running. Switched backend\.env to LOCAL_BACKEND_MODE=database for PostgreSQL/Redis."
}

if ($localMode -eq "force_local") {
  New-Item -ItemType Directory -Force -Path "backend\.local-data" | Out-Null
  Write-Warn "Docker is not running. Using the local file database at backend\.local-data\backend-store.json"
} else {
  Write-Ok "Using PostgreSQL and Redis through Docker/database mode"
}

Write-Title "Checking optional database tools"
$sqlServices = Get-Service -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -like "MSSQL*" -or $_.DisplayName -like "*SQL Server*"
}
if ($sqlServices) {
  Write-Ok "SQL Server service detected. It is optional; the default worker setup uses local file data."
} else {
  Write-Ok "SQL Server was not detected. That is fine for the default local workflow."
}

$usdaKey = Read-EnvValue $backendEnv "USDA_API_KEY" ""
if ([string]::IsNullOrWhiteSpace($usdaKey)) {
  Write-Warn "USDA live food search is not configured yet. Paste your key into backend\.env on USDA_API_KEY."
} else {
  Write-Ok "USDA FoodData Central key is configured"
}

$smtpProvider = Read-EnvValue $backendEnv "SMTP_PROVIDER" "custom"
$smtpHost = Read-EnvValue $backendEnv "SMTP_HOST" ""
$smtpPort = Read-EnvValue $backendEnv "SMTP_PORT" ""
$smtpUser = Read-EnvValue $backendEnv "SMTP_USER" ""
$smtpPassword = Read-EnvValue $backendEnv "SMTP_PASSWORD" ""
$smtpFrom = Read-EnvValue $backendEnv "SMTP_FROM" ""
$smtpSesRegion = Read-EnvValue $backendEnv "SMTP_SES_REGION" ""
$smtpPresetHasHost = $smtpProvider -in @("gmail", "outlook", "sendgrid", "mailgun") -or ($smtpProvider -eq "ses" -and -not [string]::IsNullOrWhiteSpace($smtpSesRegion))
$smtpCustomHasHost = $smtpProvider -eq "custom" -and -not [string]::IsNullOrWhiteSpace($smtpHost) -and -not [string]::IsNullOrWhiteSpace($smtpPort)
$smtpHasCredentials = -not [string]::IsNullOrWhiteSpace($smtpUser) -and -not [string]::IsNullOrWhiteSpace($smtpPassword)
if ((-not $smtpPresetHasHost -and -not $smtpCustomHasHost) -or [string]::IsNullOrWhiteSpace($smtpFrom) -or -not $smtpHasCredentials) {
  Write-Warn "SMTP is not fully configured. Signup verification codes and password reset links will not email users until backend\.env has SMTP_PROVIDER, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM."
} else {
  Write-Ok "SMTP signup verification and password reset email settings are configured for $smtpProvider"
}

if ($localMode -ne "force_local") {
  if ($dockerReady) {
    Write-Title "Starting PostgreSQL and Redis with Docker"
    & docker compose -f backend/docker-compose.yml up -d
    if ($LASTEXITCODE -ne 0) {
      throw "Docker compose could not start PostgreSQL and Redis."
    }
  } else {
    Write-Fail "LOCAL_BACKEND_MODE=database but Docker is not running. Open Docker Desktop, then run npm run start:easy again."
    exit 1
  }
}

Write-Title "Checking ports"
$backendAlreadyRunning = $false
if (Test-PortInUse 4000) {
  if (Test-BackendHealth) {
    if ($localMode -ne "force_local") {
      $deepHealth = Get-BackendDeepHealth
      if ($deepHealth -and $deepHealth.mode -eq "local") {
        Write-Fail "Backend is already running in local file mode. Stop the old backend process, then run npm run start:easy again for Docker/PostgreSQL mode."
        exit 1
      }
    }

    $backendAlreadyRunning = $true
    Write-Ok "Backend already running on http://localhost:4000"
  } else {
    Write-Fail "Port 4000 is already in use by something that is not this backend. Close it or change PORT in backend\.env."
    exit 1
  }
} else {
  Write-Ok "Backend port 4000 is available"
}

if (Test-PortInUse 8080) {
  Write-Warn "Frontend port 8080 is busy. Vite may choose another port and print it below."
} else {
  Write-Ok "Frontend port 8080 is available"
}

if (!(Test-Path "node_modules")) {
  Invoke-Npm -arguments @("install") -description "Installing frontend packages"
} else {
  Write-Ok "Frontend packages already installed"
}

if (!(Test-Path "backend\node_modules")) {
  Invoke-Npm -arguments @("--prefix", "backend", "install") -description "Installing backend packages"
} else {
  Write-Ok "Backend packages already installed"
}

if (Test-PrismaClientReady) {
  Write-Ok "Prisma client already generated. Skipping regeneration to avoid Windows file-lock errors."
} else {
  try {
    Invoke-Npm -arguments @("--prefix", "backend", "run", "prisma:generate") -description "Checking backend package compatibility"
  } catch {
    if (Test-PrismaClientReady) {
      Write-Warn "Prisma generation was blocked by Windows, but an existing generated client is ready. Continuing."
    } else {
      throw
    }
  }
}

if ($localMode -ne "force_local") {
  Invoke-Npm -arguments @("--prefix", "backend", "run", "prisma:deploy") -description "Applying database migrations"
  Write-Warn "Seed data is not run automatically in database mode to avoid duplicates. Use npm run backend:db:seed when you need it."
}

if ($CheckOnly) {
  Write-Title "Local check complete"
  Write-Ok "This computer can run the app with .\start-app.ps1"
  exit 0
}

Write-Title "Starting app"
Write-Host "Frontend: http://localhost:8080"
Write-Host "Backend:  http://localhost:4000"
Write-Host "Press Ctrl+C to stop processes started by this script."

$backendProcess = $null
$frontendProcess = $null

try {
  if (!$backendAlreadyRunning) {
    $backendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "--prefix", "backend", "run", "dev" -WorkingDirectory $Root -NoNewWindow -PassThru
    Start-Sleep -Seconds 3
  }

  $frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $Root -NoNewWindow -PassThru

  while ($true) {
    if ($backendProcess -and $backendProcess.HasExited) {
      throw "Backend stopped unexpectedly with exit code $($backendProcess.ExitCode)."
    }

    if ($frontendProcess -and $frontendProcess.HasExited) {
      throw "Frontend stopped unexpectedly with exit code $($frontendProcess.ExitCode)."
    }

    Start-Sleep -Seconds 1
  }
} finally {
  if ($frontendProcess -and !$frontendProcess.HasExited) {
    Stop-Process -Id $frontendProcess.Id -Force
  }

  if ($backendProcess -and !$backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force
  }
}
