@echo off
SETLOCAL EnableDelayedExpansion

:: Configuración
SET "MODEL_NAME=google_gemma-4-E2B-it-Q4_K_M.gguf"
SET "PORT=8085"
SET "LLM_PORT=%PORT%"
SET "CONTEXT_SIZE=8192"
SET "GPU_LAYERS=42"
SET "THREADS=8"

echo ====================================================
echo Iniciando Servidor de IA local (Gemma-4-E2B)
echo Modelo: %MODEL_NAME%
echo Puerto: %PORT%
echo Contexto: %CONTEXT_SIZE%
echo Capas GPU: %GPU_LAYERS% (Ajustar a 0 si no usas GPU)
echo ====================================================
echo.

:: Entrar al directorio del binario para que encuentre las DLLs correctamente
cd /d "%~dp0bin"

llama-server.exe -m "..\models\%MODEL_NAME%" -c %CONTEXT_SIZE% --port %PORT% -ngl %GPU_LAYERS% -t %THREADS% --host 127.0.0.1

if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocurrio un error al iniciar el servidor.
    echo Si es un error de CUDA/GPU, intenta editar este archivo y cambiar GPU_LAYERS=0
)

pause
