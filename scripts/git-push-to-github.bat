@echo off
chcp 65001 >nul
echo ============================================
echo   GAP Forêts - Push vers GitHub
echo ============================================
cd /d "%~dp0.."

where git >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Git n'est pas trouvé dans le PATH.
  echo Installez Git ou ouvrez "Git Bash" et exécutez les commandes manuellement.
  echo Voir docs/GIT_PUSH_INSTRUCTIONS.md
  pause
  exit /b 1
)

if not exist ".git" (
  echo [1/7] Initialisation du dépôt Git...
  git init
) else (
  echo [1/7] Git déjà initialisé.
)

echo [2/7] Vérification .gitignore (.env exclus)...
findstr /C:".env" .gitignore >nul 2>&1
if errorlevel 1 (
  echo [ATTENTION] .env pourrait ne pas être ignoré. Vérifiez .gitignore.
) else (
  echo   .gitignore OK.
)

echo [3/7] Ajout des fichiers (git add .)...
git add .

echo [4/7] Commit initial...
git commit -m "Initial commit - GAP Forêts production ready"
if errorlevel 1 (
  echo [INFO] Rien à committer ou commit déjà existant.
)

echo [5/7] Branche main...
git branch -M main

echo [6/7] Remote origin...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/elbakhtireda94-blip/GAP-forets.git
) else (
  echo   Remote origin déjà configuré.
)

echo [7/7] Push vers GitHub...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERREUR] Push échoué. Causes possibles:
  echo   - Authentification GitHub (token ou SSH)
  echo   - Dépôt distant vide ou conflit (essayez: git pull origin main --allow-unrelated-histories puis git push)
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Vérifications
echo ============================================
git log --oneline -3
echo.
git remote -v
echo.
git branch -a
echo.
echo [OK] Projet poussé vers https://github.com/elbakhtireda94-blip/GAP-forets
pause
