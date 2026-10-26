#!/usr/bin/env python3
"""
Secure Admin Authentication Server for USDT Cloud Miner Dashboard
- Server-side PBKDF2-HMAC-SHA256 credential verification
- Protected slug routing: Unauthenticated requests to dashboard HTML files are blocked with 302 redirect
- HttpOnly cryptographically signed session tokens
- Session expiration and secure logout
"""

import http.server
import http.cookies
import json
import os
import mimetypes
import secrets
import hashlib
import hmac
import time
from urllib.parse import urlparse

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Admin credentials
ADMIN_EMAIL = "zalavadiyajay3814@gmail.com"
# Compute PBKDF2 hash of "Jay@12345" with fixed salt
AUTH_SALT = b"usdt_cloud_miner_secure_salt_2026"
ADMIN_PASSWORD_HASH = hashlib.pbkdf2_hmac("sha256", "Jay@12345".encode("utf-8"), AUTH_SALT, 100000).hex()

# In-memory active sessions: token -> { "email": str, "expires": float }
ACTIVE_SESSIONS = {}
SESSION_LIFETIME = 86400  # 24 hours

PROTECTED_PAGES = {
    "/",
    "/index.html",
    "/Main.dc.html",
    "/Users.dc.html",
    "/Subscriptions.dc.html",
    "/Withdrawals.dc.html",
    "/Notifications.dc.html",
    "/Settings.dc.html",
}

PUBLIC_FILES = {
    "/login.html",
    "/style.css",
    "/auth-guard.js",
    "/firebase-service.js",
    "/support.js",
    "/app.js"
}

def verify_password(provided_password: str) -> bool:
    calc_hash = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), AUTH_SALT, 100000).hex()
    return hmac.compare_digest(calc_hash, ADMIN_PASSWORD_HASH)

class SecureAuthHandler(http.server.BaseHTTPRequestHandler):
    def get_session_token(self) -> str:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return ""
        cookie = http.cookies.SimpleCookie()
        try:
            cookie.load(cookie_header)
            if "admin_session" in cookie:
                return cookie["admin_session"].value
        except Exception:
            return ""
        return ""

    def is_authenticated(self) -> bool:
        token = self.get_session_token()
        if not token or token not in ACTIVE_SESSIONS:
            return False
        session_info = ACTIVE_SESSIONS[token]
        if time.time() > session_info["expires"]:
            del ACTIVE_SESSIONS[token]
            return False
        return True

    def send_json(self, status_code: int, data: dict, set_cookie: str = None):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/login":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(post_data)
                email = str(payload.get("email", "")).strip().lower()
                password = str(payload.get("password", ""))

                if email == ADMIN_EMAIL.lower() and verify_password(password):
                    token = secrets.token_hex(32)
                    ACTIVE_SESSIONS[token] = {
                        "email": ADMIN_EMAIL,
                        "name": "Jay Zalavadiya",
                        "expires": time.time() + SESSION_LIFETIME
                    }
                    cookie_header = f"admin_session={token}; Path=/; Max-Age={SESSION_LIFETIME}; HttpOnly; SameSite=Lax"
                    self.send_json(200, {
                        "success": True,
                        "email": ADMIN_EMAIL,
                        "name": "Jay Zalavadiya",
                        "message": "Authentication successful"
                    }, set_cookie=cookie_header)
                    return
                else:
                    time.sleep(0.5)  # Anti brute-force delay
                    self.send_json(401, {"success": False, "error": "Invalid email or password"})
                    return
            except Exception as e:
                self.send_json(400, {"success": False, "error": f"Invalid request: {str(e)}"})
                return

        elif path == "/api/logout":
            token = self.get_session_token()
            if token in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[token]
            cookie_header = "admin_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
            self.send_json(200, {"success": True, "message": "Logged out successfully"}, set_cookie=cookie_header)
            return

        self.send_error(404, "Not Found")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API session check
        if path == "/api/session":
            if self.is_authenticated():
                token = self.get_session_token()
                session_info = ACTIVE_SESSIONS.get(token, {})
                self.send_json(200, {
                    "authenticated": True,
                    "email": session_info.get("email", ADMIN_EMAIL),
                    "name": session_info.get("name", "Jay Zalavadiya")
                })
            else:
                self.send_json(401, {"authenticated": False})
            return

        # Check protected routing slugs
        if path in PROTECTED_PAGES:
            if not self.is_authenticated():
                self.send_response(302)
                self.send_header("Location", "/login.html")
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
                self.end_headers()
                return

        # If user visits login.html while already authenticated, redirect to dashboard
        if path == "/login.html" and self.is_authenticated():
            self.send_response(302)
            self.send_header("Location", "/index.html")
            self.end_headers()
            return

        # Map root to index.html if authenticated
        local_path = path.lstrip("/")
        if not local_path or local_path == "":
            local_path = "index.html"

        # Resolve file path safely
        file_path = os.path.normpath(os.path.join(DIRECTORY, local_path))
        if not file_path.startswith(DIRECTORY):
            self.send_error(403, "Forbidden")
            return

        # Check if file exists
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_error(404, "File Not Found")
            return

        # Check if requesting protected file directly
        normalized_web_path = "/" + os.path.relpath(file_path, DIRECTORY)
        if normalized_web_path in PROTECTED_PAGES and not self.is_authenticated():
            self.send_response(302)
            self.send_header("Location", "/login.html")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            return

        # Serve static file
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if "text" in mime_type or "html" in mime_type else mime_type)
            self.send_header("Content-Length", str(len(content)))
            if normalized_web_path in PROTECTED_PAGES:
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Internal Error: {str(e)}")

    def do_HEAD(self):
        self.do_GET()

def run_server():
    server_address = ("", PORT)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    httpd = http.server.ThreadingHTTPServer(server_address, SecureAuthHandler)
    print(f"USDT Cloud Miner Secure Auth Server running at http://localhost:{PORT}")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
