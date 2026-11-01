@echo off
chcp 65001 >nul
title HENNRI - AJUDANTE
cd /d "%~dp0"

set "PY="
where py >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  where python >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY goto nopython

if not exist ".venv\Scripts\python.exe" (
  echo.
  echo  Preparando tudo - so demora na primeira vez...
  %PY% -m venv .venv
  if errorlevel 1 goto nopython
)

rem fecha o ajudante se ja estiver rodando (senao o Windows trava os arquivos durante a atualizacao)
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*hennri_helper.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul

echo.
echo  Atualizando as ferramentas - o YouTube e o Insta mudam toda hora...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check --upgrade pip
".venv\Scripts\python.exe" -c "import torch" >nul 2>nul
if errorlevel 1 (
  echo  Instalando o motor da placa de video ^(PyTorch, uns 3 GB^) - so na primeira vez...
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r constraints.txt --index-url https://download.pytorch.org/whl/cu128
  if errorlevel 1 goto erro
)
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check --upgrade -r requirements.txt -c constraints.txt --extra-index-url https://download.pytorch.org/whl/cu128
if errorlevel 1 goto erro

rem primeira vez: mostra um codigo (HN-4821), abre o site e voce so confirma.
rem se ja estiver conectado, isso nao faz nada.
".venv\Scripts\python.exe" hennri_helper.py --conectar
if errorlevel 1 goto naoconectou

rem roda escondido, com o icone perto do relogio
start "" ".venv\Scripts\pythonw.exe" hennri_helper.py
echo.
echo  Pronto! O ajudante esta rodando perto do relogio. Pode fechar esta janela.
timeout /t 4 >nul
exit /b

:nopython
echo.
echo  Python nao encontrado.
echo  Instale o Python 3.12 ou mais novo em https://www.python.org/downloads/
echo  IMPORTANTE: na instalacao marque "Add python.exe to PATH".
echo  Depois rode este arquivo de novo.
start "" https://www.python.org/downloads/
pause
exit /b

:naoconectou
echo.
echo  Nao deu pra conectar agora. Rode o INICIAR.bat de novo com o site aberto.
pause
exit /b

:erro
echo.
echo  Deu erro na instalacao. Tire um print desta janela e mande pro Claude.
pause
