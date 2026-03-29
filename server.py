#!/usr/bin/env python3
"""
StudyAI Pro — Server
Serves static files + proxies OpenRouter API (keeps key server-side)
"""
import http.server, socketserver, os, json, urllib.request, urllib.error

PORT = int(os.environ.get('PORT', 8000))
OPENROUTER_KEY = os.environ.get('OPENROUTER_API_KEY', '')
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Fallback chain — if one model is rate-limited (429) or unavailable, try the next
FREE_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'qwen/qwen3-coder:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'google/gemma-3-12b-it:free',
]
FALLBACK_MODEL = FREE_MODELS[0]

class Handler(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-cache, no-store')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/health':
            self._health()
        else:
            super().do_GET()

    def do_POST(self):
        p = self.path.rstrip('/')
        if p == '/api/chat':
            self._proxy_openrouter()
        else:
            self._json_error(404, f'Unknown endpoint: {self.path}')

    def _health(self):
        body = json.dumps({
            'status':      'ok',
            'key_set':     bool(OPENROUTER_KEY),
            'key_preview': (OPENROUTER_KEY[:14] + '...') if OPENROUTER_KEY else 'NOT SET',
            'fallback_models': FREE_MODELS,
        }).encode()
        self._send_json(200, body)

    def _proxy_openrouter(self):
        if not OPENROUTER_KEY:
            self._json_error(500,
                'OPENROUTER_API_KEY is not set. '
                'Go to Render dashboard -> Environment -> Add OPENROUTER_API_KEY = sk-or-v1-...'
            )
            return

        length = int(self.headers.get('Content-Length', 0))
        raw    = self.rfile.read(length)

        try:
            payload = json.loads(raw)
        except Exception:
            self._json_error(400, 'Invalid JSON body')
            return

        # Normalize model — fallback if invalid
        model = payload.get('model', '') or FALLBACK_MODEL
        if '/' not in model:
            model = FALLBACK_MODEL
        payload['model'] = model

        # Build fallback chain: requested model first, then all others
        tried = {model}
        chain = [model] + [m for m in FREE_MODELS if m not in tried]
        self._call_with_fallback(payload, chain, 0)

    def _call_with_fallback(self, payload, chain, idx):
        if idx >= len(chain):
            self._json_error(429, 'All free models are rate-limited. Please try again in a minute.')
            return

        payload['model'] = chain[idx]
        data = json.dumps(payload).encode()
        req  = urllib.request.Request(
            'https://openrouter.ai/api/v1/chat/completions',
            data=data,
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
                self._send_json(200, resp.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode('utf-8', errors='replace')
            # On rate-limit (429) or model not found (404), try next model
            if e.code in (429, 404) or 'No endpoints' in err or 'rate' in err.lower():
                print(f'[fallback] {chain[idx]} → {e.code}, trying next…')
                self._call_with_fallback(payload, chain, idx + 1)
            else:
                self._json_error(e.code, err[:500])
        except urllib.error.URLError as e:
            self._json_error(503, f'Cannot reach OpenRouter: {e.reason}')
        except Exception as ex:
            self._json_error(500, str(ex))

    def _send_json(self, code, body_bytes):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)

    def _json_error(self, code, msg):
        self._send_json(code, json.dumps({'error': {'message': msg}}).encode())

    def log_message(self, fmt, *args):
        if len(args) >= 2 and str(args[1]) not in ('200', '204', '304'):
            print(f'[{args[1]}] {self.path}')

print(f'\n{"="*52}')
print(f'  StudyAI Pro  ->  http://localhost:{PORT}')
print(f'  OpenRouter key: {"SET ✓" if OPENROUTER_KEY else "NOT SET ✗"}')
print(f'  Fallback model: {FALLBACK_MODEL}')
print(f'{"="*52}\n')

with socketserver.TCPServer(('', PORT), Handler) as httpd:
    httpd.allow_reuse_address = True
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
