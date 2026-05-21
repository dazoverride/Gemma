#!/bin/bash

# Configuración
MODEL_NAME="google_gemma-4-E2B-it-Q4_K_M.gguf"
PORT="8080"
export LLM_PORT="$PORT"
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
    echo "ADVERTENCIA: No se encontró 'llama-server' preinstalado."
    echo "Iniciando descarga y compilación automática de llama.cpp..."
    echo ""

    # 1. Comprobar herramientas de compilación
    if ! command -v git &> /dev/null || ! command -v cmake &> /dev/null || ! command -v g++ &> /dev/null || ! command -v make &> /dev/null; then
        echo "Instalando dependencias de compilación (git, build-essential, cmake)..."
        if command -v apt-get &> /dev/null; then
            if [ "$EUID" -ne 0 ]; then
                echo "Se requiere sudo para instalar dependencias de sistema."
                sudo apt-get update && sudo apt-get install -y build-essential git cmake
            else
                apt-get update && apt-get install -y build-essential git cmake
            fi
        else
            echo "ERROR: No se encontró apt-get. Por favor, instala git, cmake y g++ manualmente en tu sistema."
            exit 1
        fi
    fi

    # 2. Clonar y compilar llama.cpp
    mkdir -p bin
    echo "Clonando repositorio de llama.cpp (shallow clone)..."
    git clone --depth 1 https://github.com/ggerganov/llama.cpp bin/llama.cpp-src
    if [ $? -ne 0 ]; then
        echo "ERROR: No se pudo clonar llama.cpp."
        exit 1
    fi

    echo "Configurando y compilando llama.cpp con CMake (esto puede tomar unos minutos)..."
    cd bin/llama.cpp-src || exit 1
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF
    if [ $? -ne 0 ]; then
        echo "ERROR: Falló la configuración de CMake."
        cd ../..
        exit 1
    fi
    cmake --build build --config Release -j"$THREADS"
    if [ -f "./build/bin/llama-server" ]; then
        cp ./build/bin/llama-server ../llama-server
        # Copiar cualquier librería compartida que se haya podido generar
        find build/ -name "*.so*" -exec cp -d {} ../ \; 2>/dev/null
        cd ../..
        echo "Limpiando archivos temporales de compilación..."
        rm -rf bin/llama.cpp-src
        LLAMA_BIN="./bin/llama-server"
        echo "¡Compilación completada con éxito! Binario guardado en ./bin/llama-server"
    else
        echo "ERROR: Falló la compilación de llama-server."
        cd ../..
        exit 1
    fi
fi

# Verificar dependencias de Python
if ! command -v python3 &> /dev/null; then
    echo "Instalando python3..."
    if command -v apt-get &> /dev/null; then
        if [ "$EUID" -ne 0 ]; then
            sudo apt-get update && sudo apt-get install -y python3
        else
            apt-get update && apt-get install -y python3
        fi
    else
        echo "ERROR: python3 no está instalado. Por favor instálalo manualmente."
        exit 1
    fi
fi

MODEL_PATH="./models/$MODEL_NAME"

# Verificar que el modelo existe
if [ ! -f "$MODEL_PATH" ]; then
    echo "ERROR: No se encontró el modelo en: $MODEL_PATH"
    echo "Por favor, asegúrate de haber subido el archivo del modelo a la carpeta 'models/'."
    exit 1
fi

# Iniciar llama-server en segundo plano
echo "Ejecutando Servidor de IA: $LLAMA_BIN"
LD_LIBRARY_PATH="./bin:$LD_LIBRARY_PATH" "$LLAMA_BIN" -m "$MODEL_PATH" -c "$CONTEXT_SIZE" --port "$PORT" -ngl "$GPU_LAYERS" -t "$THREADS" --host 127.0.0.1 > llama.log 2>&1 &
LLAMA_PID=$!

# Control de salida limpia con Ctrl+C (SIGINT/SIGTERM)
cleanup() {
    echo ""
    echo "Deteniendo servidores..."
    if [ ! -z "$LLAMA_PID" ]; then
        kill "$LLAMA_PID" 2>/dev/null
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Servidor de IA iniciado en segundo plano (PID: $LLAMA_PID). Logs en llama.log"
echo ""

# Iniciar servidor web de Python en primer plano
echo "Iniciando Servidor Web del Asistente (puerto 5000)..."
if [ -f "src/web_server.py" ]; then
    python3 src/web_server.py
else
    echo "ERROR: No se encontró 'src/web_server.py'."
    kill "$LLAMA_PID" 2>/dev/null
    exit 1
fi

