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

function Get-NodeMajorVersion {
  $raw = (& node -v).Trim()
  if ($raw -notmatch "^v(\d+)\.") {
    throw "Could not read Node.js version from '$raw'."
  }
  return [int]$Matches[1]
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

$nodeMajor = Get-NodeMajorVersion
if ($nodeMajor -lt 20) {
  Write-Fail "Node.js 20 or newer is required. Current version: $(& node -v)"
  exit 1
}
Write-Ok "Node.js $(& node -v)"
Write-Ok "npm $(& npm -v)"

if (!(Test-Path "package.json") -or !(Test-Path "backend\package.json")) {
  Write-Fail "Run this script from the project root. Expected package.json and backend\package.json."
  exit 1
}
Write-Ok "Project files found"

Write-Title "Preparing environment files"
Ensure-EnvFile ".env.example" ".env"
Ensure-EnvFile "backend\.env.example" "backend\.env"

$backendEnv = "backend\.env"
if (!(Select-String -Path $backendEnv -Pattern "^LOCAL_BACKEND_MODE=" -Quiet)) {
  Add-Content $backendEnv "LOCAL_BACKEND_MODE=force_local"
  Write-Ok "Added LOCAL_BACKEND_MODE=force_local to backend\.env"
}

if (!(Select-String -Path $backendEnv -Pattern "^USDA_API_KEY=" -Quiet)) {
  Add-Content $backendEnv "USDA_API_KEY=YOUR_USDA_API_KEY_HERE  # PASTE YOUR USDA API KEY HERE"
  Add-Content $backendEnv "USDA_BASE_URL=https://api.nal.usda.gov/fdc/v1"
  Write-Ok "Added USDA API key placeholder to backend\.env"
}

$localMode = Read-EnvValue $backendEnv "LOCAL_BACKEND_MODE" "force_local"
if ($localMode -eq "force_local") {
  New-Item -ItemType Directory -Force -Path "backend\.local-data" | Out-Null
  Write-Ok "Using the local file database at backend\.local-data\backend-store.json"
} else {
  Write-Warn "LOCAL_BACKEND_MODE is '$localMode'. The app may require PostgreSQL and Redis."
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
if ([string]::IsNullOrWhiteSpace($usdaKey) -or $usdaKey -like "YOUR_USDA_API_KEY_HERE*") {
  Write-Warn "USDA live food search is not configured yet. Paste your key into backend\.env on USDA_API_KEY."
} else {
  Write-Ok "USDA FoodData Central key is configured"
}

if ($localMode -ne "force_local") {
  if (Test-CommandExists "docker") {
    Write-Title "Starting PostgreSQL and Redis with Docker"
    & docker compose -f backend/docker-compose.yml up -d
    if ($LASTEXITCODE -ne 0) {
      throw "Docker compose could not start PostgreSQL and Redis."
    }
  } else {
    Write-Warn "Docker is not installed. PostgreSQL/Redis must already be running for database mode."
  }
}

Write-Title "Checking ports"
$backendAlreadyRunning = $false
if (Test-PortInUse 4000) {
  if (Test-BackendHealth) {
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

if ($localMode -eq "force_local" -and (Test-PrismaClientReady)) {
  Write-Ok "Prisma client already generated. Skipping regeneration to avoid Windows file-lock errors."
} else {
  try {
    Invoke-Npm -arguments @("--prefix", "backend", "run", "prisma:generate") -description "Checking backend package compatibility"
  } catch {
    if ($localMode -eq "force_local" -and (Test-PrismaClientReady)) {
      Write-Warn "Prisma generation was blocked by Windows, but an existing generated client is ready. Continuing in local mode."
    } else {
      throw
    }
  }
}

if ($localMode -ne "force_local") {
  Invoke-Npm -arguments @("--prefix", "backend", "run", "prisma:migrate") -description "Running database migrations"
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
