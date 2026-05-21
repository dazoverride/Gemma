import urllib.request
import urllib.error
import json
import sys

def main():
    url = "http://127.0.0.1:8080/v1/chat/completions"
    
    # Prompt de prueba
    prompt = "Tengo 3 cajas: una azul, una roja y una verde. En la caja azul hay una pelota. Muevo la pelota de la caja azul a la roja. Luego, muevo la caja roja dentro de la verde. ¿Dónde está la pelota ahora? Explica paso a paso."
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "messages": [
            {"role": "system", "content": "Eres un asistente de IA útil y conciso."},
            {"role": "user", "content": prompt}
        ],
        "stream": True,
        "temperature": 0.7
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode("utf-8"), 
        headers=headers, 
        method="POST"
    )
    
    print("====================================================")
    
    print(f"Enviando prompt: '{prompt}'")
    print(f"Conectando a {url}...")
    print("====================================================")
    print("Respuesta: ", end="", flush=True)
    
    try:
        in_thinking = False
        with urllib.request.urlopen(req) as response:
            for line in response:
                line_str = line.decode("utf-8").strip()
                if not line_str:
                    continue
                
                # Las respuestas en streaming de OpenAI comienzan con "data: "
                if line_str.startswith("data: "):
                    content_json = line_str[6:]
                    if content_json.strip() == "[DONE]":
                        break
                    
                    try:
                        chunk = json.loads(content_json)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        
                        reasoning = delta.get("reasoning_content")
                        content = delta.get("content")
                        
                        if reasoning is not None and reasoning != "":
                            if not in_thinking:
                                print("\n\n[PROCESO DE PENSAMIENTO]:\n", end="", flush=True)
                                in_thinking = True
                            print(reasoning, end="", flush=True)
                            
                        if content is not None and content != "":
                            if in_thinking:
                                print("\n\n[RESPUESTA]:\n", end="", flush=True)
                                in_thinking = False
                            print(content, end="", flush=True)
                    except json.JSONDecodeError:
                        pass
        print("\n\n====================================================")
        print("Petición completada con éxito.")
    except urllib.error.URLError as e:
        print(f"\n\nError: No se pudo conectar al servidor en {url}.")
        print("Asegúrate de que 'run_server.bat' está ejecutándose correctamente.")
        print(f"Detalle del error: {e}")
    except KeyboardInterrupt:
        print("\nPrueba cancelada por el usuario.")

if __name__ == "__main__":
    main()
