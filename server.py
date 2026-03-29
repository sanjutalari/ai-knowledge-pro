#!/usr/bin/env python3
"""
StudyAI Pro — Server
Serves the app and proxies OpenRouter API calls (keeps API key server-side)
"""
import http.server, socketserver, os, json, urllib.request, urllib.error
from urllib.parse import urlparse

PORT = int(os.environ.get('PORT', 8000))
OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY', '')
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/chat':
            self._proxy_openrouter()
        elif self.path == '/api/health':
            self._health()
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/health':
            self._health()
        else:
            super().do_GET()

    def _health(self):
        body = json.dumps({
            'status': 'ok',
            'key_set': bool(OPENROUTER_KEY),
            'key_preview': OPENROUTER_KEY[:14]+'...' if OPENROUTER_KEY else 'NOT SET'
        }).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_openrouter(self):
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length)

        if not OPENROUTER_KEY:
            self._json_error(500, 'OPENROUTER_API_KEY not set on server. Add it in Render Environment variables.')
            return

        req = urllib.request.Request(
            'https://openrouter.ai/api/v1/chat/completions',
            data=body,
            headers={
                'Authorization': f'Bearer {OPENROUTER_KEY}',
                'Content-Type':  'application/json',
                'HTTP-Referer':  'https://studyai-pro.onrender.com',
                'X-Title':       'StudyAI Pro',
            },
            method='POST'
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(data))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self._json_error(e.code, e.read().decode()[:400])
        except Exception as ex:
            self._json_error(500, str(ex))

    def _json_error(self, code, msg):
        body = json.dumps({'error': {'message': msg}}).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass  # suppress logs

print(f'\n{"="*50}')
print(f'  StudyAI Pro  →  http://localhost:{PORT}')
print(f'  API key set: {"YES ✓" if OPENROUTER_KEY else "NO — set OPENROUTER_API_KEY"}')
print(f'{"="*50}\n')

with socketserver.TCPServer(('', PORT), Handler) as httpd:
    httpd.allow_reuse_address = True
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
