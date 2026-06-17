@echo off
setlocal
cd /d "%~dp0"

set "REPO=https://github.com/Excomeragro/SisPlanilla-Exco.git"

where git >nul 2>nul
if errorlevel 1 (
  echo No se encontro Git instalado en esta computadora.
  echo Instala Git y vuelve a abrir este archivo.
  pause
  exit /b 1
)

if not exist ".git" git init
git config --global --add safe.directory "%CD:\=/%" >nul 2>nul
git config user.name >nul 2>nul || git config user.name "Excomeragro"
git config user.email >nul 2>nul || git config user.email "Excomeragro@users.noreply.github.com"

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO%"
) else (
  git remote set-url origin "%REPO%"
)

git symbolic-ref HEAD refs/heads/main

git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 (
  echo Sincronizando por primera vez con GitHub...
  git fetch origin main
  if not errorlevel 1 git reset --mixed origin/main
)

git add .
git diff --cached --quiet
if not errorlevel 1 (
  echo No hay cambios nuevos para subir.
  pause
  exit /b 0
)

git commit -m "Actualizacion SisPlanilla Exco"
if errorlevel 1 goto :error

git pull --rebase origin main
if errorlevel 1 goto :error

git push -u origin main
if errorlevel 1 goto :error

echo.
echo Cambios subidos correctamente a GitHub.
pause
exit /b 0

:error
echo.
echo No se pudo completar la subida. Revisa el mensaje mostrado arriba.
pause
exit /b 1
