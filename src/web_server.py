import http.server
import socketserver
import os
import sys
import json
import sqlite3
import urllib.request
import urllib.error

PORT = 5000
WEB_DIR = os.path.join(os.path.dirname(__file__), 'web')
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db')
DB_PATH = os.path.join(DB_DIR, 'history.db')
DB_LOGS_PATH = os.path.join(DB_DIR, 'logs.db')

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()
    # Create conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            system_prompt TEXT,
            temperature REAL,
            thinking INTEGER,
            max_tokens INTEGER,
            top_p REAL,
            frequency_penalty REAL,
            presence_penalty REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Create messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

def init_logs_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_LOGS_PATH)
    cursor = conn.cursor()
    # Create model_logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS model_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            reasoning TEXT,
            temperature REAL,
            max_tokens INTEGER,
            thinking_enabled INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Servir desde el subdirectorio 'web'
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def send_json_response(self, data, status_code=200):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(response_bytes))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/conversations'):
            self.handle_api_get()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/conversations'):
            self.handle_api_post()
        elif self.path.startswith('/api/logs'):
            self.handle_api_logs_post()
        elif self.path.startswith('/api/chat'):
            self.handle_api_chat_proxy()
        else:
            # Mandar 404 para POSTs que no sean API
            self.send_error(404, "Method not allowed")

    def do_DELETE(self):
        if self.path.startswith('/api/conversations'):
            self.handle_api_delete()
        else:
            self.send_error(404, "Method not allowed")

    def handle_api_get(self):
        path_parts = [p for p in self.path.split('/') if p]
        
        # GET /api/conversations
        if len(path_parts) == 2:
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT id, title, system_prompt, temperature, thinking, max_tokens, top_p, frequency_penalty, presence_penalty, created_at FROM conversations ORDER BY created_at DESC")
                rows = cursor.fetchall()
                conversations = []
                for r in rows:
                    conversations.append({
                        "id": r[0],
                        "title": r[1],
                        "system_prompt": r[2],
                        "temperature": r[3],
                        "thinking": bool(r[4]),
                        "max_tokens": r[5],
                        "top_p": r[6],
                        "frequency_penalty": r[7],
                        "presence_penalty": r[8],
                        "created_at": r[9]
                    })
                conn.close()
                self.send_json_response(conversations)
            except Exception as e:
                self.send_json_response({"error": str(e)}, 500)
                
        # GET /api/conversations/<id>
        elif len(path_parts) == 3:
            try:
                conv_id = int(path_parts[2])
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT id, title, system_prompt, temperature, thinking, max_tokens, top_p, frequency_penalty, presence_penalty FROM conversations WHERE id = ?", (conv_id,))
                conv = cursor.fetchone()
                if not conv:
                    conn.close()
                    self.send_json_response({"error": "Conversation not found"}, 404)
                    return
                
                cursor.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC", (conv_id,))
                msg_rows = cursor.fetchall()
                messages = [{"role": m[0], "content": m[1]} for m in msg_rows]
                conn.close()
                
                self.send_json_response({
                    "id": conv[0],
                    "title": conv[1],
                    "system_prompt": conv[2],
                    "temperature": conv[3],
                    "thinking": bool(conv[4]),
                    "max_tokens": conv[5],
                    "top_p": conv[6],
                    "frequency_penalty": conv[7],
                    "presence_penalty": conv[8],
                    "messages": messages
                })
            except ValueError:
                self.send_json_response({"error": "Invalid conversation ID"}, 400)
            except Exception as e:
                self.send_json_response({"error": str(e)}, 500)
        else:
            self.send_json_response({"error": "Invalid endpoint"}, 400)

    def handle_api_post(self):
        path_parts = [p for p in self.path.split('/') if p]
        
        # Leer el cuerpo del JSON
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
        except Exception as e:
            self.send_json_response({"error": f"Invalid JSON body: {str(e)}"}, 400)
            return

        # POST /api/conversations
        if len(path_parts) == 2:
            try:
                title = data.get('title', 'Nueva conversación')
                system_prompt = data.get('system_prompt', '')
                temperature = data.get('temperature', 0.7)
                thinking = 1 if data.get('thinking', False) else 0
                max_tokens = data.get('max_tokens', 2048)
                top_p = data.get('top_p', 0.9)
                frequency_penalty = data.get('frequency_penalty', 0.0)
                presence_penalty = data.get('presence_penalty', 0.0)
                
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO conversations (title, system_prompt, temperature, thinking, max_tokens, top_p, frequency_penalty, presence_penalty)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (title, system_prompt, temperature, thinking, max_tokens, top_p, frequency_penalty, presence_penalty))
                conv_id = cursor.lastrowid
                conn.commit()
                conn.close()
                
                self.send_json_response({"id": conv_id, "title": title})
            except Exception as e:
                self.send_json_response({"error": str(e)}, 500)
                
        # POST /api/conversations/<id>
        elif len(path_parts) == 3:
            try:
                conv_id = int(path_parts[2])
                conn = sqlite3.connect(DB_PATH)
                conn.execute("PRAGMA foreign_keys = ON")
                cursor = conn.cursor()
                
                # Verificar existencia
                cursor.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,))
                if not cursor.fetchone():
                    conn.close()
                    self.send_json_response({"error": "Conversation not found"}, 404)
                    return
                
                # Actualizar metadatos
                if 'title' in data:
                    cursor.execute("UPDATE conversations SET title = ? WHERE id = ?", (data['title'], conv_id))
                if 'system_prompt' in data:
                    cursor.execute("UPDATE conversations SET system_prompt = ? WHERE id = ?", (data['system_prompt'], conv_id))
                if 'temperature' in data:
                    cursor.execute("UPDATE conversations SET temperature = ? WHERE id = ?", (data['temperature'], conv_id))
                if 'thinking' in data:
                    cursor.execute("UPDATE conversations SET thinking = ? WHERE id = ?", (1 if data['thinking'] else 0, conv_id))
                if 'max_tokens' in data:
                    cursor.execute("UPDATE conversations SET max_tokens = ? WHERE id = ?", (data['max_tokens'], conv_id))
                if 'top_p' in data:
                    cursor.execute("UPDATE conversations SET top_p = ? WHERE id = ?", (data['top_p'], conv_id))
                if 'frequency_penalty' in data:
                    cursor.execute("UPDATE conversations SET frequency_penalty = ? WHERE id = ?", (data['frequency_penalty'], conv_id))
                if 'presence_penalty' in data:
                    cursor.execute("UPDATE conversations SET presence_penalty = ? WHERE id = ?", (data['presence_penalty'], conv_id))
                
                # Sobrescribir mensajes
                if 'messages' in data:
                    cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
                    for msg in data['messages']:
                        cursor.execute('''
                            INSERT INTO messages (conversation_id, role, content)
                            VALUES (?, ?, ?)
                        ''', (conv_id, msg['role'], msg['content']))
                
                conn.commit()
                conn.close()
                self.send_json_response({"status": "success"})
            except ValueError:
                self.send_json_response({"error": "Invalid conversation ID"}, 400)
            except Exception as e:
                self.send_json_response({"error": str(e)}, 500)
        else:
            self.send_json_response({"error": "Invalid endpoint"}, 400)

    def handle_api_logs_post(self):
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
        except Exception as e:
            self.send_json_response({"error": f"Invalid JSON body: {str(e)}"}, 400)
            return

        try:
            prompt = data.get('prompt', '')
            response = data.get('response', '')
            reasoning = data.get('reasoning', '')
            temperature = data.get('temperature', 0.7)
            max_tokens = data.get('max_tokens', 2048)
            thinking_enabled = 1 if data.get('thinking_enabled', False) else 0

            conn = sqlite3.connect(DB_LOGS_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO model_logs (prompt, response, reasoning, temperature, max_tokens, thinking_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (prompt, response, reasoning, temperature, max_tokens, thinking_enabled))
            conn.commit()
            conn.close()

            self.send_json_response({"status": "success"})
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_chat_proxy(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
        except Exception as e:
            self.send_json_response({"error": f"Error al leer cuerpo de petición: {str(e)}"}, 400)
            return

        llm_port = os.environ.get('LLM_PORT', '8080')
        llm_url = f'http://127.0.0.1:{llm_port}/v1/chat/completions'
        
        req = urllib.request.Request(
            llm_url,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                
                # Reenviar cabeceras necesarias
                for key, val in response.getheaders():
                    if key.lower() in ['content-type', 'cache-control', 'connection', 'access-control-allow-origin']:
                        self.send_header(key, val)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                # Transmisión en trozos (streaming en tiempo real)
                while True:
                    chunk = response.read(256)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    try:
                        self.wfile.flush()
                    except Exception:
                        break # Si el cliente cierra el navegador
        except urllib.error.URLError as e:
            self.send_json_response({
                "error": f"No se pudo conectar con el motor LLM local: {str(e)}"
            }, 502)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_delete(self):
        path_parts = [p for p in self.path.split('/') if p]
        
        # DELETE /api/conversations/<id>
        if len(path_parts) == 3:
            try:
                conv_id = int(path_parts[2])
                conn = sqlite3.connect(DB_PATH)
                conn.execute("PRAGMA foreign_keys = ON")
                cursor = conn.cursor()
                cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
                conn.commit()
                conn.close()
                self.send_json_response({"status": "success"})
            except ValueError:
                self.send_json_response({"error": "Invalid conversation ID"}, 400)
            except Exception as e:
                self.send_json_response({"error": str(e)}, 500)
        else:
            self.send_json_response({"error": "Invalid endpoint"}, 400)

def main():
    # Inicializar Base de Datos SQLite en la carpeta db
    init_db()
    init_logs_db()
    
    if not os.path.exists(WEB_DIR):
        print(f"Error: La carpeta '{WEB_DIR}' no existe.")
        sys.exit(1)
        
    handler = CustomHTTPRequestHandler
    
    # Permitir la reutilización del puerto inmediatamente después de cerrarlo
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("====================================================")
        print(f"Servidor Web del Asistente ejecutándose localmente con DB.")
        print(f"Por favor abre tu navegador en: http://localhost:{PORT}")
        print("====================================================")
        print("Presiona Ctrl+C para detener el servidor web.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor web...")

if __name__ == "__main__":
    main()
