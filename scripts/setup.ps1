# One-command setup after `git clone` (Windows PowerShell 5.1+ / PowerShell 7).
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -Runtime   # runtime deps only
# Override the interpreter with:  $env:PYTHON = "C:\Path\to\python.exe"
param([switch]$Runtime)
$ErrorActionPreference = "Stop"

function Say($msg) { Write-Host "`n==> $msg" }
function Run($exe, [string[]]$argList) {
    & $exe @argList
    if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $exe $($argList -join ' ')" }
}

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

if ($env:PYTHON) { $Py = $env:PYTHON; $PyArgs = @() }
elseif (Get-Command py -ErrorAction SilentlyContinue) { $Py = "py"; $PyArgs = @("-3") }
else { $Py = "python"; $PyArgs = @() }

& $Py @PyArgs -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if ($LASTEXITCODE -ne 0) { throw "Python 3.10+ is required (tried: $Py $PyArgs)" }

Say "Backend virtual environment: backend\.venv"
$VPy = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $VPy)) { Run $Py ($PyArgs + @("-m", "venv", (Join-Path $Backend ".venv"))) }
Run $VPy @("--version")

$Shared = Join-Path $Backend "requirements.txt"
if (Test-Path $Shared) {
    Say "Installing backend\requirements.txt (shared backend dependencies)"
    Run $VPy @("-m", "pip", "install", "-r", $Shared)
} else { Write-Host "    (backend\requirements.txt not present yet - skipped)" }

if ($Runtime) {
    Say "Installing backend\requirements-mae2.txt (module runtime dependencies)"
    Run $VPy @("-m", "pip", "install", "-r", (Join-Path $Backend "requirements-mae2.txt"))
} else {
    Say "Installing backend\requirements-mae2-dev.txt (module runtime + test dependencies)"
    Run $VPy @("-m", "pip", "install", "-r", (Join-Path $Backend "requirements-mae2-dev.txt"))
}

Say "Checking installed packages are consistent"
Run $VPy @("-m", "pip", "check")

Say "Smoke test: import the backend module (offline)"
Push-Location $Backend
try { Run $VPy @("-c", "import spatial_and_flight as m; s = m.get_flight_schedule(m.DEMO_FLIGHT, 0); assert s['supported']; print('    spatial_and_flight OK, touchdown', s['touchdown']['display'])") }
finally { Pop-Location }

if (Test-Path (Join-Path $Frontend "package.json")) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "frontend\package.json found but npm is not installed (install Node.js LTS)" }
    Say "Installing frontend dependencies"
    Push-Location $Frontend
    try { if (Test-Path "package-lock.json") { Run "npm" @("ci") } else { Run "npm" @("install") } }
    finally { Pop-Location }
} else { Write-Host "    (frontend\package.json not present yet - skipped)" }

Say "Done. Next:"
Write-Host "    cd backend; .venv\Scripts\python.exe -m pytest tests -q      # run tests (offline)"
Write-Host "    cd backend; .venv\Scripts\python.exe spatial_and_flight.py   # offline demo"
