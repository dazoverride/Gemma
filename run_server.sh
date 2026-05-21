#!/bin/bash

# Configuración
MODEL_NAME="google_gemma-4-E2B-it-Q4_K_M.gguf"
PORT="8080"
CONTEXT_SIZE="8192"
GPU_LAYERS="0" # Por defecto 0 (CPU) en VPS. Ajustar a 42 o similar si dispones de GPU compatible con CUDA.
THREADS=$(nproc 2>/dev/null || echo 4) # Detecta automáticamente los hilos/núcleos disponibles

echo "===================================================="
echo "Iniciando Servidor de IA local (Gemma-4-E2B) en Linux"
echo "Modelo: $MODEL_NAME"
echo "Puerto: $PORT"
echo "Contexto: $CONTEXT_SIZE"
echo "Hilos CPU: $THREADS"
echo "Capas GPU: $GPU_LAYERS"
echo "===================================================="

# Buscar el binario llama-server en localizaciones comunes
LLAMA_BIN=""
if command -v llama-server &> /dev/null; then
    LLAMA_BIN="llama-server"
elif [ -f "./bin/llama-server" ]; then
    LLAMA_BIN="./bin/llama-server"
elif [ -f "./llama-server" ]; then
    LLAMA_BIN="./llama-server"
elif [ -f "../llama.cpp/llama-server" ]; then
    LLAMA_BIN="../llama.cpp/llama-server"
else
    echo "ERROR: No se encontró el binario 'llama-server' en el sistema."
    echo "Por favor, instala llama.cpp, compílalo o coloca el binario 'llama-server' en './bin/' o en la raíz."
    echo ""
    echo "Instrucciones rápidas para compilarlo en tu VPS Linux (Ubuntu/Debian):"
    echo "  sudo apt update && sudo apt install build-essential git -y"
    echo "  git clone https://github.com/ggerganov/llama.cpp"
    echo "  cd llama.cpp && make -j"
    echo "  cp llama-server /ruta/a/tu/proyecto/bin/"
    exit 1
fi

MODEL_PATH="./models/$MODEL_NAME"

# Verificar que el modelo existe
if [ ! -f "$MODEL_PATH" ]; then
    echo "ERROR: No se encontró el modelo en: $MODEL_PATH"
    echo "Por favor, asegúrate de haber subido el archivo del modelo a la carpeta 'models/'."
    exit 1
fi

echo "Ejecutando: $LLAMA_BIN"
exec "$LLAMA_BIN" -m "$MODEL_PATH" -c "$CONTEXT_SIZE" --port "$PORT" -ngl "$GPU_LAYERS" -t "$THREADS" --host 127.0.0.1
