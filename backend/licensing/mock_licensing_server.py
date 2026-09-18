#!/usr/bin/env python3
"""
==========================================================
BROWSER AGENT - LOCAL MOCK LICENSING & TOP-UP SERVER
Standard Library Python (Zero Dependencies)
Usage: python3 backend/licensing/mock_licensing_server.py [port]
Default Port: 8787
==========================================================
"""

import sys
import os
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta

DATA_FILE = os.path.join(os.path.dirname(__file__), "mock_licenses.json")

def load_db():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    # Default demo seed
    now = datetime.now()
    seed = {
        "BA-PRO-ACTIVE-DEMO": {
            "license_key": "BA-PRO-ACTIVE-DEMO",
            "customer_name": "Demo Pro User",
            "customer_email": "user@example.com",
            "status": "active",
            "tier": "pro",
            "max_devices": 2,
            "device_ids": [],
            "expires_at": (now + timedelta(days=30)).isoformat()
        },
        "BA-PRO-EXPIRED-TEST": {
            "license_key": "BA-PRO-EXPIRED-TEST",
            "customer_name": "Expired Test User",
            "customer_email": "expired@example.com",
            "status": "expired",
            "tier": "pro",
            "max_devices": 1,
            "device_ids": [],
            "expires_at": (now - timedelta(days=2)).isoformat()
        },
        "BA-TRIAL-NEW-USER": {
            "license_key": "BA-TRIAL-NEW-USER",
            "customer_name": "Trial Explorer",
            "customer_email": "trial@example.com",
            "status": "trial",
            "tier": "trial",
            "max_devices": 1,
            "device_ids": [],
            "expires_at": (now + timedelta(days=3)).isoformat()
        }
    }
    save_db(seed)
    return seed

def save_db(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

class LicensingHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/health", "/"):
            return self._send_json(200, {
                "status": "ok",
                "service": "Browser Agent Mock Licensing Server",
                "time": datetime.now().isoformat()
            })
        elif self.path == "/licenses":
            db = load_db()
            return self._send_json(200, db)
        else:
            return self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        body_raw = self.rfile.read(content_len) if content_len > 0 else b"{}"
        try:
            body = json.loads(body_raw.decode("utf-8"))
        except Exception:
            body = {}

        path = self.path.split("?")[0]

        if path == "/verify":
            license_key = body.get("license_key", "").strip().upper()
            device_id = body.get("device_id", "").strip()

            if not license_key:
                return self._send_json(400, {"status": "error", "message": "License key required"})

            db = load_db()
            if license_key not in db:
                return self._send_json(404, {
                    "status": "invalid",
                    "message": f"License key '{license_key}' tidak terdaftar."
                })

            lic = db[license_key]
            devices = lic.get("device_ids", [])
            max_dev = lic.get("max_devices", 1)

            if device_id:
                if device_id not in devices:
                    if len(devices) < max_dev:
                        devices.append(device_id)
                        lic["device_ids"] = devices
                        db[license_key] = lic
                        save_db(db)
                    else:
                        return self._send_json(403, {
                            "status": "device_limit_reached",
                            "message": f"Lisensi ini sudah terhubung ke {max_dev} perangkat maksimal.",
                            "max_devices": max_dev
                        })

            # Check expiration
            expires_at = datetime.fromisoformat(lic["expires_at"])
            now = datetime.now()
            is_expired = (expires_at <= now)
            days_left = max(0, (expires_at - now).days)

            status = "expired" if is_expired else lic.get("status", "active")
            lic["status"] = status
            db[license_key] = lic
            save_db(db)

            return self._send_json(200, {
                "status": status,
                "license_key": license_key,
                "tier": lic.get("tier", "pro"),
                "customer_name": lic.get("customer_name", "User"),
                "expires_at": lic["expires_at"],
                "days_remaining": days_left,
                "device_id": device_id,
                "topup_url": f"https://tiarproperty.mayar.link/topup?key={license_key}"
            })

        elif path == "/topup":
            # Simulate Payment Gateway Webhook / Top-Up Action
            license_key = body.get("license_key", "").strip().upper()
            days = int(body.get("duration_days", 30))

            db = load_db()
            if license_key not in db:
                return self._send_json(404, {"status": "error", "message": "License key not found"})

            lic = db[license_key]
            current_expiry = datetime.fromisoformat(lic["expires_at"])
            now = datetime.now()

            if current_expiry < now:
                new_expiry = now + timedelta(days=days)
            else:
                new_expiry = current_expiry + timedelta(days=days)

            lic["expires_at"] = new_expiry.isoformat()
            lic["status"] = "active"
            db[license_key] = lic
            save_db(db)

            return self._send_json(200, {
                "status": "success",
                "message": f"Top-up berhasil! Masa aktif bertambah {days} hari.",
                "license_key": license_key,
                "new_expires_at": lic["expires_at"],
                "days_remaining": (new_expiry - now).days
            })

        else:
            return self._send_json(404, {"error": "Endpoint not found"})

def run_server(port=8787):
    server = HTTPServer(("0.0.0.0", port), LicensingHandler)
    print(f"[*] Browser Agent Mock Licensing Server running on http://127.0.0.1:{port}")
    print(f"[*] Data file: {DATA_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping server.")
        server.server_close()

if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    run_server(p)
