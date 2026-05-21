# Servidor y Asistente Gemma-4-E2B

Este proyecto contiene la configuración del servidor de IA local utilizando `llama.cpp` y el modelo multimodal de tamaño eficiente de Google: **Gemma-4-E2B**.

## Estructura del Proyecto

```text
Gemma/
├── run_server.bat          # Script para iniciar el servidor de inferencia local
├── .gitignore              # Configuración de exclusión para Git (ignora bin/ y models/)
├── README.md               # Este archivo de documentación
├── bin/                    # Binario ejecutable y DLLs de llama.cpp (soporte CUDA 12.4)
├── models/                 # Directorio donde se almacenan los modelos (.gguf)
└── src/                    # Código fuente del asistente
    ├── client.py           # Cliente en Python para probar peticiones en streaming
    └── test_capabilities.py# Batería de pruebas para evaluar al modelo
```

## Requisitos Previos

1. **Python 3.x** instalado.
2. Si deseas utilizar aceleración por GPU (NVIDIA), asegúrate de tener instalados los drivers de NVIDIA compatibles con **CUDA 12.4**.

## Instrucciones de Uso

### 1. Iniciar el Servidor de IA
Haz doble clic en `run_server.bat` en la raíz del proyecto, o ejecútalo desde tu terminal:
```bash
.\run_server.bat
```
*Por defecto cargará `google_gemma-4-E2B-it-Q4_K_M.gguf` asignando 42 capas a la GPU. Si no tienes GPU compatible o tienes problemas de memoria, edita el archivo `.bat` y cambia `GPU_LAYERS=0`.*

### 2. Probar el Cliente de Chat (Streaming)
Una vez el servidor esté listo y escuchando en `http://127.0.0.1:8080`, ejecuta el cliente de pruebas:
```bash
python src/client.py
```
*Este cliente procesará y separará de forma nativa el proceso de pensamiento (`[PROCESO DE PENSAMIENTO]`) de la respuesta final del modelo.*
