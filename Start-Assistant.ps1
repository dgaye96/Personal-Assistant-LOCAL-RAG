[CmdletBinding()]
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend'
$frontendPath = Join-Path $projectRoot 'frontend'
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'

function Test-HttpService {
    param([string]$Url)

    try {
        Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Wait-HttpService {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 15
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        if (Test-HttpService $Url) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    return $false
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop est requis et doit etre accessible depuis PowerShell.'
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    throw 'Ollama est requis. Installez-le puis executez : ollama pull llama3.1:8b ; ollama pull nomic-embed-text'
}

Set-Location $projectRoot
if (-not (Test-HttpService 'http://127.0.0.1:6333/readyz')) {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw 'Qdrant ne peut pas etre demarre par Docker. Verifiez les journaux avec : docker compose logs qdrant'
    }
}

if (-not (Test-HttpService 'http://127.0.0.1:6333/readyz')) {
    throw 'Qdrant ne repond pas sur http://127.0.0.1:6333 apres son demarrage.'
}

if (-not (Test-HttpService 'http://127.0.0.1:11434/api/tags')) {
    throw 'Ollama ne repond pas sur http://127.0.0.1:11434. Lancez Ollama puis relancez ce script.'
}

if (-not (Test-Path $venvPython)) {
    py -3 -m venv (Join-Path $projectRoot '.venv')
}

if (-not $SkipInstall) {
    & $venvPython -m pip install -r (Join-Path $backendPath 'requirements.txt')
    if (-not (Test-Path (Join-Path $frontendPath 'node_modules'))) {
        Push-Location $frontendPath
        npm install
        Pop-Location
    }
}

$frontendCommand = 'npm.cmd run dev -- --host 127.0.0.1 --strictPort'

if (-not (Test-HttpService 'http://127.0.0.1:8000/health')) {
    Start-Process -FilePath $venvPython -WorkingDirectory $backendPath -ArgumentList '-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'
}

if (-not (Test-HttpService 'http://127.0.0.1:5173')) {
    Start-Process -FilePath 'powershell.exe' -WorkingDirectory $frontendPath -ArgumentList '-NoExit', '-Command', $frontendCommand
}

if (-not (Wait-HttpService 'http://127.0.0.1:5173')) {
    throw 'Le frontend Vite ne repond pas sur http://127.0.0.1:5173. Consultez la nouvelle fenetre PowerShell ouverte par le script.'
}

Write-Host 'Assistant personnel demarre. Ouvrez http://localhost:5173' -ForegroundColor Green
$global:LASTEXITCODE = 0