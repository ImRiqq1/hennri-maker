@echo off
chcp 65001 >nul
title HENNRI - AJUDANTE - INICIO AUTOMATICO
cd /d "%~dp0"

if not exist ".venv\Scripts\pythonw.exe" (
  echo.
  echo  Rode o INICIAR.bat primeiro ^(ele instala tudo^).
  pause
  exit /b
)

rem atalho na pasta Inicializar do Windows: o ajudante liga junto com o PC
set "ATALHO=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\HENNRI Ajudante.lnk"
powershell -NoProfile -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:ATALHO);" ^
  "$s.TargetPath = '%~dp0.venv\Scripts\pythonw.exe';" ^
  "$s.Arguments = '\"%~dp0hennri_helper.py\"';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'HENNRI - Ajudante do maker.hennri.com';" ^
  "$s.Save()"
if errorlevel 1 (
  echo  Nao consegui criar o atalho.
  pause
  exit /b
)
echo.
echo  Pronto! O ajudante agora liga sozinho quando o Windows abrir.
echo  Pra desligar isso, apague o atalho "HENNRI Ajudante" em:
echo  %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo.
pause
