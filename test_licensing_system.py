#!/usr/bin/env python3
"""
Test Suite: Browser Agent Licensing & Top-Up System
"""

import sys
import os
import time
import json
import threading
from http.client import HTTPConnection

# Add host to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "host"))
from native_host import get_machine_fingerprint

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "licensing"))
from mock_licensing_server import HTTPServer, LicensingHandler, DATA_FILE, save_db

PORT = 8799
server_thread = None
httpd = None

def start_server():
    global httpd
    # Clear / reset data file for clean test
    if os.path.exists(DATA_FILE):
        try:
            os.remove(DATA_FILE)
        except Exception:
            pass
    httpd = HTTPServer(("127.0.0.1", PORT), LicensingHandler)
    httpd.serve_forever()

def run_tests():
    print("\n--- 1. Testing Device Fingerprint Generation ---")
    fp = get_machine_fingerprint()
    assert fp.get("status") == "ok", f"Expected ok, got {fp}"
    assert "BA-" in fp.get("device_id", ""), f"Invalid device_id format: {fp.get('device_id')}"
    assert len(fp.get("fingerprint", "")) == 64, "Expected SHA256 fingerprint"
    print(f"✔ Device ID: {fp.get('device_id')} (Platform: {fp.get('platform')})")

    conn = HTTPConnection("127.0.0.1", PORT)

    print("\n--- 2. Testing Server Health ---")
    conn.request("GET", "/health")
    res = conn.getresponse()
    assert res.status == 200
    data = json.loads(res.read().decode())
    assert data["status"] == "ok"
    print(f"✔ Mock Server online: {data['service']}")

    print("\n--- 3. Testing Active License Verification ---")
    req_body = json.dumps({
        "license_key": "BA-PRO-ACTIVE-DEMO",
        "device_id": fp.get("device_id")
    })
    conn.request("POST", "/verify", body=req_body, headers={"Content-Type": "application/json"})
    res = conn.getresponse()
    assert res.status == 200
    data = json.loads(res.read().decode())
    assert data["status"] == "active"
    assert data["days_remaining"] > 25
    print(f"✔ Active license verified: {data['license_key']}, Status: {data['status']}, Days: {data['days_remaining']}")

    print("\n--- 4. Testing Expired License ---")
    req_body = json.dumps({
        "license_key": "BA-PRO-EXPIRED-TEST",
        "device_id": fp.get("device_id")
    })
    conn.request("POST", "/verify", body=req_body, headers={"Content-Type": "application/json"})
    res = conn.getresponse()
    assert res.status == 200
    data = json.loads(res.read().decode())
    assert data["status"] == "expired"
    assert data["days_remaining"] == 0
    print(f"✔ Expired license verified: {data['license_key']}, Status: {data['status']}, Days: {data['days_remaining']}")

    print("\n--- 5. Testing Top-Up Functionality (Extending Expired License) ---")
    req_body = json.dumps({
        "license_key": "BA-PRO-EXPIRED-TEST",
        "duration_days": 30
    })
    conn.request("POST", "/topup", body=req_body, headers={"Content-Type": "application/json"})
    res = conn.getresponse()
    assert res.status == 200
    data = json.loads(res.read().decode())
    assert data["status"] == "success"
    assert data["days_remaining"] >= 29
    print(f"✔ Top-Up successful! New expiry days: {data['days_remaining']}")

    # Re-verify expired key now shows active
    req_body = json.dumps({
        "license_key": "BA-PRO-EXPIRED-TEST",
        "device_id": fp.get("device_id")
    })
    conn.request("POST", "/verify", body=req_body, headers={"Content-Type": "application/json"})
    res = conn.getresponse()
    data = json.loads(res.read().decode())
    assert data["status"] == "active"
    print(f"✔ Re-verification confirms license is now ACTIVE after Top-Up!")

    print("\n--- 6. Testing Device Limit Rejection ---")
    # BA-TRIAL-NEW-USER has max_devices = 1
    req_body = json.dumps({"license_key": "BA-TRIAL-NEW-USER", "device_id": "DEVICE-A"})
    conn.request("POST", "/verify", body=req_body, headers={"Content-Type": "application/json"})
    res = conn.getresponse()
    assert res.status == 200
    print("✔ Device A bound successfully to single-seat license")

    # Second device should be rejected
    req_body = json.dumps({"license_key": "BA-TRIAL-NEW-USER", "device_id": "DEVICE-B"})
    conn.request("POST", "/verify", body=req_body, headers={"Content-Type": "application/json"})
    res = conn.getresponse()
    assert res.status == 403
    data = json.loads(res.read().decode())
    assert data["status"] == "device_limit_reached"
    print(f"✔ Device B rejected: {data['message']}")

    print("\n========================================================")
    print("  🎉 ALL LICENSING & TOP-UP TESTS PASSED SUCCESSFULLY!  ")
    print("========================================================\n")

if __name__ == "__main__":
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    time.sleep(0.5)
    try:
        run_tests()
    finally:
        if httpd:
            httpd.server_close()
