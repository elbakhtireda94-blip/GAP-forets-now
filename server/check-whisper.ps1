# Script de vérification des prérequis pour Whisper local (Windows PowerShell)
# Usage: .\check-whisper.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vérification des prérequis Whisper Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Vérifier Python
Write-Host "[1/4] Vérification Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Python trouvé: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Python non trouvé" -ForegroundColor Red
        Write-Host "    → Installer depuis https://www.python.org/downloads/" -ForegroundColor Gray
        Write-Host "    → Cocher 'Add Python to PATH' lors de l'installation" -ForegroundColor Gray
        $allOk = $false
    }
} catch {
    Write-Host "  ✗ Python non trouvé (erreur: $_)" -ForegroundColor Red
    Write-Host "    → Installer depuis https://www.python.org/downloads/" -ForegroundColor Gray
    $allOk = $false
}

Write-Host ""

# 2. Vérifier pip
Write-Host "[2/4] Vérification pip..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ pip trouvé: $pipVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ pip non trouvé" -ForegroundColor Red
        Write-Host "    → Réinstaller Python avec pip inclus" -ForegroundColor Gray
        $allOk = $false
    }
} catch {
    Write-Host "  ✗ pip non trouvé" -ForegroundColor Red
    $allOk = $false
}

Write-Host ""

# 3. Vérifier faster-whisper
Write-Host "[3/4] Vérification faster-whisper..." -ForegroundColor Yellow
try {
    $importTest = python -c "import faster_whisper; print('OK')" 2>&1
    if ($LASTEXITCODE -eq 0 -and $importTest -eq "OK") {
        Write-Host "  ✓ faster-whisper installé" -ForegroundColor Green
    } else {
        Write-Host "  ✗ faster-whisper non installé" -ForegroundColor Red
        Write-Host "    → Installer avec: pip install faster-whisper" -ForegroundColor Gray
        $allOk = $false
    }
} catch {
    Write-Host "  ✗ faster-whisper non installé (erreur: $_)" -ForegroundColor Red
    Write-Host "    → Installer avec: pip install faster-whisper" -ForegroundColor Gray
    $allOk = $false
}

Write-Host ""

# 4. Vérifier FFmpeg
Write-Host "[4/4] Vérification FFmpeg..." -ForegroundColor Yellow
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ FFmpeg trouvé: $ffmpegVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FFmpeg non trouvé" -ForegroundColor Red
        Write-Host "    → Télécharger depuis https://ffmpeg.org/download.html" -ForegroundColor Gray
        Write-Host "    → Extraire et ajouter au PATH (ou placer dans C:\Windows\System32)" -ForegroundColor Gray
        $allOk = $false
    }
} catch {
    Write-Host "  ✗ FFmpeg non trouvé" -ForegroundColor Red
    Write-Host "    → Télécharger depuis https://ffmpeg.org/download.html" -ForegroundColor Gray
    $allOk = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allOk) {
    Write-Host "✓ Tous les prérequis sont installés !" -ForegroundColor Green
    Write-Host "  La transcription locale Whisper est prête." -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Certains prérequis manquent." -ForegroundColor Red
    Write-Host "  Installez les composants manquants puis relancez ce script." -ForegroundColor Yellow
    exit 1
}
