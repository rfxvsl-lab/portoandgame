import json
import secrets
import sqlite3
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = '0.0.0.0'
PORT = 8080
DB_PATH = Path('content.db')
ADMIN_EMAIL = 'mhmmadridho64@gmail.com'
ADMIN_PASSWORD = 'ridho2026'
SESSIONS = {}

DEFAULT_CONTENT = {
    'hero_intro': 'Halo, saya',
    'hero_name': 'Nama Anda',
    'hero_subtitle': 'Creative Developer • Video Editor • Storyteller',
    'about_title': 'About Me · Story Mode',
    'story_1_title': 'Chapter 1 · Spark',
    'story_1_text': 'Awal perjalanan dimulai dari rasa penasaran terhadap desain dan coding interaktif.',
    'story_2_title': 'Chapter 2 · Build',
    'story_2_text': 'Membangun website, video, dan visual storytelling yang engaging.',
    'story_3_title': 'Chapter 3 · Evolve',
    'story_3_text': 'Menyeimbangkan kreativitas, performa, dan user experience modern.',
    'projects_title': 'Projects',
    'games_title': 'Mini Game Zone',
    'leaderboard_title': 'Leaderboard Lokal',
    'project_1_title': 'Immersive Landing',
    'project_2_title': 'Brand Motion Reel',
    'project_3_title': 'UI Aesthetic Kit',
    'game_1_desc': 'Gerakkan karakter dengan mouse / sentuh untuk menangkap skill.',
    'game_3_desc': 'Tekan Space/↑ untuk lompat dan hindari bug!',
    'secret_message': '🌌 Secret Mode unlocked: "You found the hidden cosmos of creativity!"',
    'contact_title': 'Contact Me',
    'contact_button': 'Kirim Pesan'
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('CREATE TABLE IF NOT EXISTS content (k TEXT PRIMARY KEY, v TEXT NOT NULL)')
    return conn


def seed_content():
    conn = get_db()
    with conn:
        for key, value in DEFAULT_CONTENT.items():
            conn.execute('INSERT OR IGNORE INTO content(k, v) VALUES(?, ?)', (key, value))
    conn.close()


def fetch_content():
    conn = get_db()
    rows = conn.execute('SELECT k, v FROM content').fetchall()
    conn.close()
    return {k: v for k, v in rows}


def update_content(values):
    conn = get_db()
    with conn:
        for key, value in values.items():
            conn.execute('INSERT INTO content(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', (key, str(value)))
    conn.close()


class Handler(SimpleHTTPRequestHandler):
    def _json(self, payload, status=HTTPStatus.OK, headers=None):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length) if length else b'{}'
        try:
            return json.loads(raw.decode('utf-8'))
        except json.JSONDecodeError:
            return None

    def _session_token(self):
        cookie_header = self.headers.get('Cookie')
        if not cookie_header:
            return None
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        return cookie['session'].value if 'session' in cookie else None

    def _authorized(self):
        token = self._session_token()
        return bool(token and token in SESSIONS)

    def do_GET(self):
        if self.path in ('/admin', '/admin.html'):
            self.path = '/admin.html'
            return super().do_GET()

        if self.path == '/api/content':
            return self._json({'content': fetch_content()})

        if self.path == '/api/session':
            return self._json({'authenticated': self._authorized()})

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/login':
            data = self._read_json()
            if data is None:
                return self._json({'error': 'JSON tidak valid'}, status=HTTPStatus.BAD_REQUEST)
            if data.get('email') == ADMIN_EMAIL and data.get('password') == ADMIN_PASSWORD:
                token = secrets.token_urlsafe(24)
                SESSIONS[token] = ADMIN_EMAIL
                return self._json(
                    {'ok': True, 'message': 'Login berhasil'},
                    headers={'Set-Cookie': f'session={token}; HttpOnly; Path=/; SameSite=Lax'}
                )
            return self._json({'ok': False, 'error': 'Email/password salah'}, status=HTTPStatus.UNAUTHORIZED)

        if self.path == '/api/logout':
            token = self._session_token()
            if token:
                SESSIONS.pop(token, None)
            return self._json({'ok': True}, headers={'Set-Cookie': 'session=; Path=/; Max-Age=0; SameSite=Lax'})

        if self.path == '/api/content/update':
            if not self._authorized():
                return self._json({'error': 'Unauthorized'}, status=HTTPStatus.UNAUTHORIZED)
            data = self._read_json()
            if data is None or 'content' not in data or not isinstance(data['content'], dict):
                return self._json({'error': 'Payload tidak valid'}, status=HTTPStatus.BAD_REQUEST)
            update_content(data['content'])
            return self._json({'ok': True, 'content': fetch_content()})

        self._json({'error': 'Not found'}, status=HTTPStatus.NOT_FOUND)


if __name__ == '__main__':
    seed_content()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f'Serving on http://{HOST}:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
