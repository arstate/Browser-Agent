#!/usr/bin/env python3
import sys
import os
import struct
import json
import threading
import codecs
import traceback
import subprocess
import signal
import time

LOG_FILE = "/tmp/browser_agent_host.log"
if sys.platform == "win32":
    LOG_FILE = os.path.join(os.environ.get("TEMP", "C:\\Temp"), "browser_agent_host.log")

def log(msg):
    try:
        log_dir = os.path.dirname(LOG_FILE)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except Exception:
        pass

# Clear log on startup
try:
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
except Exception:
    pass

log("Starting Browser Agent Native Messaging Host...")

IS_WINDOWS = sys.platform == "win32"

if not IS_WINDOWS:
    import pty
    import termios
    import fcntl

stdout_lock = threading.Lock()

def read_exact_bytes(n):
    data = bytearray()
    while len(data) < n:
        try:
            chunk = sys.stdin.buffer.read(n - len(data))
            if not chunk:
                return None
            data.extend(chunk)
        except Exception as e:
            log(f"Error in read_exact_bytes: {e}")
            return None
    return bytes(data)

def read_message():
    try:
        raw_length = read_exact_bytes(4)
        if not raw_length:
            log("Read 0 bytes for length, exiting...")
            return None
        message_length = struct.unpack('@I', raw_length)[0]
        if message_length == 0 or message_length > 100 * 1024 * 1024:
            log(f"Invalid message length: {message_length}")
            return None
        raw_message = read_exact_bytes(message_length)
        if not raw_message:
            log(f"Incomplete message read: expected {message_length} bytes")
            return None
        message = raw_message.decode('utf-8')
        return json.loads(message)
    except Exception as e:
        log(f"Error reading message: {e}")
        return None

CHUNK_SIZE = 500 * 1024  # 500 KB limit per message to safely stay under Chrome's 1MB native messaging limit

def write_message(message):
    try:
        serialized = json.dumps(message).encode('utf-8')
        if len(serialized) > CHUNK_SIZE and isinstance(message, dict) and "id" in message and not message.get("is_chunk"):
            req_id = message["id"]
            raw_str = serialized.decode('utf-8', errors='replace')
            total_chunks = (len(raw_str) + CHUNK_SIZE - 1) // CHUNK_SIZE
            log(f"Message payload {len(serialized)} bytes exceeds 500KB limit. Splitting into {total_chunks} chunks for req {req_id}")
            for i in range(total_chunks):
                chunk_str = raw_str[i * CHUNK_SIZE : (i + 1) * CHUNK_SIZE]
                chunk_msg = {
                    "id": req_id,
                    "is_chunk": True,
                    "chunk_index": i,
                    "total_chunks": total_chunks,
                    "chunk_data": chunk_str
                }
                chunk_bytes = json.dumps(chunk_msg).encode('utf-8')
                with stdout_lock:
                    sys.stdout.buffer.write(struct.pack('@I', len(chunk_bytes)))
                    sys.stdout.buffer.write(chunk_bytes)
                    sys.stdout.buffer.flush()
            return

        with stdout_lock:
            sys.stdout.buffer.write(struct.pack('@I', len(serialized)))
            sys.stdout.buffer.write(serialized)
            sys.stdout.buffer.flush()
    except Exception as e:
        log(f"Error writing message: {e}\n{traceback.format_exc()}")

# ==========================================
# Local SQLite Database for Chat History
# ==========================================
import sqlite3

DB_DIR = os.path.expanduser("~/.browser-agent")
if sys.platform == "win32":
    DB_DIR = os.path.join(os.environ.get("USERPROFILE", os.environ.get("APPDATA", "C:\\")), ".browser-agent")

DB_PATH = os.path.join(DB_DIR, "chat_history.db")
IMAGES_DIR = os.path.join(DB_DIR, "generated_images")
SCREENSHOTS_DIR = os.path.join(DB_DIR, "walkthrough_screenshots")
AGENTS_DIR = os.path.join(DB_DIR, "agents")
SKILLS_DIR = os.path.join(DB_DIR, "skills")
MEMORIES_DIR = os.path.join(DB_DIR, "memories")

import base64
import urllib.request
import datetime

def init_db():
    try:
        os.makedirs(DB_DIR, exist_ok=True)
        os.makedirs(IMAGES_DIR, exist_ok=True)
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        os.makedirs(AGENTS_DIR, exist_ok=True)
        os.makedirs(SKILLS_DIR, exist_ok=True)
        os.makedirs(MEMORIES_DIR, exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    model TEXT NOT NULL,
                    message_count INTEGER DEFAULT 0,
                    preview TEXT DEFAULT '',
                    messages_json TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC)")

            # Dedicated Settings Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)

            # Dedicated Model Configurations Table (Separated from general settings)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS model_configs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    priority_order INTEGER DEFAULT 0,
                    is_primary INTEGER DEFAULT 0,
                    config_json TEXT DEFAULT '{}',
                    updated_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_model_priority ON model_configs(priority_order ASC)")
            conn.commit()
        log(f"SQLite database initialized at {DB_PATH}, tables & directories ready")
    except Exception as e:
        log(f"Failed to initialize SQLite database: {e}")

init_db()

# ==========================================
# Markdown File Helpers (YAML Frontmatter + Body)
# ==========================================
def parse_md_file(file_path):
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            raw = f.read()
        
        meta = {}
        content = raw
        if raw.startswith("---"):
            parts = raw.split("---", 2)
            if len(parts) >= 3:
                header_lines = parts[1].strip().split("\n")
                for line in header_lines:
                    if ":" in line:
                        k, v = line.split(":", 1)
                        k = k.strip()
                        v = v.strip()
                        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                            v = v[1:-1]
                        elif v.startswith("[") and v.endswith("]"):
                            try:
                                v = json.loads(v)
                            except Exception:
                                v = [item.strip().strip("'\"") for item in v[1:-1].split(",") if item.strip()]
                        elif v.lower() == "true":
                            v = True
                        elif v.lower() == "false":
                            v = False
                        elif v.isdigit():
                            v = int(v)
                        meta[k] = v
                content = parts[2].strip()
        return {"meta": meta, "content": content}
    except Exception as e:
        log(f"Error parsing {file_path}: {e}")
        return None

def write_md_file(file_path, meta, content):
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        header_str = "---\n"
        for k, v in meta.items():
            if isinstance(v, (list, dict, bool, int, float)):
                header_str += f"{k}: {json.dumps(v)}\n"
            else:
                header_str += f"{k}: {str(v)}\n"
        header_str += "---\n\n"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(header_str + (content or "").strip() + "\n")
        return True
    except Exception as e:
        log(f"Error writing {file_path}: {e}")
        return False

# ==========================================
# Agents, Skills, & Memories Managers
# ==========================================
def list_md_items(target_dir):
    try:
        os.makedirs(target_dir, exist_ok=True)
        items = []
        for filename in sorted(os.listdir(target_dir)):
            if filename.endswith(".md"):
                file_path = os.path.join(target_dir, filename)
                parsed = parse_md_file(file_path)
                if parsed:
                    item_data = parsed["meta"]
                    item_data["id"] = item_data.get("id") or filename.replace(".md", "")
                    item_data["content"] = parsed["content"]
                    item_data["file_path"] = file_path
                    items.append(item_data)
        return {"status": "ok", "items": items}
    except Exception as e:
        log(f"Error listing {target_dir}: {e}")
        return {"status": "error", "error": str(e)}

def save_md_item(target_dir, item_data):
    try:
        item_id = item_data.get("id")
        if not item_id:
            name_slug = (item_data.get("name") or "item").lower().replace(" ", "_")
            item_id = f"{name_slug}_{int(time.time())}"
        
        file_path = os.path.join(target_dir, f"{item_id}.md")
        content = item_data.get("content") or item_data.get("system_prompt") or item_data.get("instructions") or ""
        
        meta = {
            "id": item_id,
            "name": item_data.get("name") or "Untitled",
            "description": item_data.get("description") or "",
            "updated_at": int(time.time() * 1000)
        }
        if "skills" in item_data:
            meta["skills"] = item_data.get("skills") or []
        if "memories" in item_data:
            meta["memories"] = item_data.get("memories") or []
        if "model" in item_data:
            meta["model"] = item_data.get("model") or ""
        if "is_default" in item_data:
            meta["is_default"] = bool(item_data.get("is_default"))
        if "created_at" in item_data:
            meta["created_at"] = item_data.get("created_at")
        else:
            meta["created_at"] = int(time.time() * 1000)

        success = write_md_file(file_path, meta, content)
        if success:
            return {"status": "ok", "id": item_id, "file_path": file_path, "item": {**meta, "content": content}}
        else:
            return {"status": "error", "error": "Failed to write file"}
    except Exception as e:
        log(f"Error saving item in {target_dir}: {e}")
        return {"status": "error", "error": str(e)}

def delete_md_item(target_dir, item_id):
    try:
        file_path = os.path.join(target_dir, f"{item_id}.md")
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"status": "ok", "id": item_id, "deleted": True}
        return {"status": "error", "error": "Item not found"}
    except Exception as e:
        log(f"Error deleting {item_id} in {target_dir}: {e}")
        return {"status": "error", "error": str(e)}

def save_generated_image(image_id, image_data, prompt=""):
    try:
        os.makedirs(IMAGES_DIR, exist_ok=True)
        if not image_id:
            image_id = f"img_{int(time.time() * 1000)}"
        file_path = os.path.join(IMAGES_DIR, f"{image_id}.png")
        
        if not image_data:
            return {"status": "error", "error": "No image data provided"}

        if image_data.startswith("data:image/"):
            header, b64 = image_data.split(",", 1)
            raw_bytes = base64.b64decode(b64)
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
        elif image_data.startswith("http://") or image_data.startswith("https://"):
            req = urllib.request.Request(image_data, headers={"User-Agent": "BrowserAgent/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw_bytes = resp.read()
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
        else:
            raw_bytes = base64.b64decode(image_data)
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
                
        log(f"Saved generated image to {file_path}")
        return {
            "status": "ok",
            "image_id": image_id,
            "file_path": file_path,
            "file_name": f"{image_id}.png",
            "prompt": prompt
        }
    except Exception as e:
        log(f"Error saving generated image: {e}")
        return {"status": "error", "error": str(e)}

def get_generated_image(image_id):
    try:
        if not image_id:
            return {"status": "error", "error": "No image_id provided"}
        file_path = os.path.join(IMAGES_DIR, f"{image_id}.png")
        if not os.path.exists(file_path):
            return {"status": "error", "error": f"Image file not found: {image_id}"}
        with open(file_path, "rb") as f:
            raw_bytes = f.read()
        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        return {
            "status": "ok",
            "image_id": image_id,
            "data_url": f"data:image/png;base64,{b64}",
            "file_path": file_path
        }
    except Exception as e:
        log(f"Error reading generated image: {e}")
def save_screenshot(screenshot_id, image_data, label="", session_id=""):
    try:
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        now = datetime.datetime.now()
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        
        clean_label = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in (label or "")).strip("_")
        if clean_label:
            clean_label = f"_{clean_label[:30]}"
        
        if not screenshot_id:
            screenshot_id = f"walkthrough_{timestamp_str}{clean_label}"
        else:
            screenshot_id = f"{screenshot_id}_{timestamp_str}{clean_label}"
            
        file_name = f"{screenshot_id}.png"
        file_path = os.path.join(SCREENSHOTS_DIR, file_name)
        
        if not image_data:
            return {"status": "error", "error": "No image data provided"}

        if image_data.startswith("data:image/"):
            header, b64 = image_data.split(",", 1)
            raw_bytes = base64.b64decode(b64)
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
        else:
            raw_bytes = base64.b64decode(image_data)
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
                
        log(f"Saved walkthrough screenshot to {file_path}")
        return {
            "status": "ok",
            "screenshot_id": screenshot_id,
            "file_path": file_path,
            "file_name": file_name,
            "dir_path": SCREENSHOTS_DIR,
            "label": label,
            "session_id": session_id
        }
    except Exception as e:
        log(f"Error saving screenshot: {e}")
        return {"status": "error", "error": str(e)}

def extract_text_preview(content):
    if not content:
        return ""
    if isinstance(content, str):
        return content[:120]
    if isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text" and "text" in part:
                    text_parts.append(str(part.get("text", "")))
                elif "text" in part:
                    text_parts.append(str(part.get("text", "")))
            elif isinstance(part, str):
                text_parts.append(part)
        res = " ".join(text_parts).strip()
        return res[:120] if res else "[Lampiran Media]"
    if isinstance(content, dict):
        if "text" in content:
            return str(content["text"])[:120]
        return str(content)[:120]
    return str(content)[:120]

def db_save_session(session_data):
    try:
        sid = str(session_data.get("id") or f"sess_{int(time.time() * 1000)}")
        title = str(session_data.get("title") or "New Chat")
        model = str(session_data.get("model") or "Default Model")
        messages = session_data.get("messages") or []
        if not isinstance(messages, list):
            messages = []
        msg_count = len(messages)
        
        preview = ""
        for m in messages:
            if isinstance(m, dict):
                disp = m.get("displayContent")
                if disp and isinstance(disp, str) and disp.strip():
                    preview = disp[:120]
                    break
                if m.get("role") == "user":
                    preview = extract_text_preview(m.get("content"))
                    if preview:
                        break
        if not preview and messages:
            first = messages[0]
            if isinstance(first, dict):
                preview = extract_text_preview(first.get("displayContent") or first.get("content"))
        
        if not isinstance(preview, str):
            preview = str(preview)[:120]

        now = int(time.time() * 1000)
        created_at = int(session_data.get("created_at") or now)
        updated_at = now
        messages_json = json.dumps(messages)

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (id, title, model, message_count, preview, messages_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    model=excluded.model,
                    message_count=excluded.message_count,
                    preview=excluded.preview,
                    messages_json=excluded.messages_json,
                    updated_at=excluded.updated_at
            """, (sid, title, model, int(msg_count), str(preview), str(messages_json), int(created_at), int(updated_at)))
            conn.commit()

        return {"status": "ok", "id": sid, "title": title, "updated_at": updated_at}
    except Exception as e:
        log(f"Error in db_save_session: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

def db_get_sessions(search=""):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if search and search.strip():
                query = f"%{search.strip()}%"
                cursor.execute("""
                    SELECT id, title, model, message_count, preview, created_at, updated_at
                    FROM sessions
                    WHERE title LIKE ? OR preview LIKE ? OR model LIKE ?
                    ORDER BY updated_at DESC
                """, (query, query, query))
            else:
                cursor.execute("""
                    SELECT id, title, model, message_count, preview, created_at, updated_at
                    FROM sessions
                    ORDER BY updated_at DESC
                """)
            rows = cursor.fetchall()
            sessions = [dict(row) for row in rows]
            return {"status": "ok", "sessions": sessions}
    except Exception as e:
        log(f"Error in db_get_sessions: {e}")
        return {"status": "error", "error": str(e)}

def prune_messages_for_rpc(messages):
    if not isinstance(messages, list):
        return []
    pruned = []
    for m in messages:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        content = m.get("content")
        
        # Tool outputs in session history are only needed for UI badge summary
        if role == "tool":
            content = '{"status":"success"}'
            clean_m = {
                "role": "tool",
                "content": content
            }
            if "name" in m:
                clean_m["name"] = m["name"]
            if "tool_call_id" in m:
                clean_m["tool_call_id"] = m["tool_call_id"]
            pruned.append(clean_m)
            continue

        clean_m = {
            "role": role,
            "content": content
        }
        if "displayContent" in m:
            clean_m["displayContent"] = m["displayContent"]
        if "attachments" in m:
            clean_m["attachments"] = m["attachments"]
        if "tool_calls" in m:
            clean_m["tool_calls"] = m["tool_calls"]
        if "agentInfo" in m:
            clean_m["agentInfo"] = m["agentInfo"]
        if "name" in m:
            clean_m["name"] = m["name"]
        pruned.append(clean_m)
    return pruned

def db_get_session(sid):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions WHERE id = ?", (sid,))
            row = cursor.fetchone()
            if not row:
                return {"status": "error", "error": "Session not found"}
            res = dict(row)
            try:
                raw_messages = json.loads(res["messages_json"])
                res["messages"] = prune_messages_for_rpc(raw_messages)
            except Exception as parse_err:
                log(f"Error parsing messages_json for session {sid}: {parse_err}")
                res["messages"] = []
            del res["messages_json"]
            return {"status": "ok", "session": res}
    except Exception as e:
        log(f"Error in db_get_session: {e}")
        return {"status": "error", "error": str(e)}

def db_delete_session(sid):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE id = ?", (sid,))
            conn.commit()
            return {"status": "ok", "id": sid, "deleted": True}
    except Exception as e:
        log(f"Error in db_delete_session: {e}")
        return {"status": "error", "error": str(e)}

def db_clear_all():
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions")
            conn.commit()
            return {"status": "ok", "cleared": True}
    except Exception as e:
        log(f"Error in db_clear_all: {e}")
        return {"status": "error", "error": str(e)}

# ==========================================
# Dedicated Settings & Model Configs SQLite Handlers
# ==========================================
def db_save_setting(key, value):
    try:
        now = int(time.time() * 1000)
        val_json = json.dumps(value) if not isinstance(value, str) else value
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO settings (key, value_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json=excluded.value_json,
                    updated_at=excluded.updated_at
            """, (str(key), str(val_json), int(now)))
            conn.commit()
        return {"status": "ok", "key": key, "updated_at": now}
    except Exception as e:
        log(f"Error in db_save_setting: {e}")
        return {"status": "error", "error": str(e)}

def db_get_setting(key):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM settings WHERE key = ?", (str(key),))
            row = cursor.fetchone()
            if not row:
                return {"status": "error", "error": "Setting not found"}
            res = dict(row)
            try:
                res["value"] = json.loads(res["value_json"])
            except Exception:
                res["value"] = res["value_json"]
            del res["value_json"]
            return {"status": "ok", "setting": res}
    except Exception as e:
        log(f"Error in db_get_setting: {e}")
        return {"status": "error", "error": str(e)}

def db_get_all_settings():
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM settings ORDER BY key ASC")
            rows = cursor.fetchall()
            settings = {}
            for r in rows:
                k = r["key"]
                try:
                    settings[k] = json.loads(r["value_json"])
                except Exception:
                    settings[k] = r["value_json"]
            
            cursor.execute("SELECT * FROM model_configs ORDER BY priority_order ASC")
            m_rows = cursor.fetchall()
            models = []
            for mr in m_rows:
                m_dict = dict(mr)
                try:
                    m_dict["config"] = json.loads(m_dict.get("config_json", "{}"))
                except Exception:
                    m_dict["config"] = {}
                models.append({
                    "id": m_dict["model_id"],
                    "name": m_dict["name"],
                    "priority_order": m_dict["priority_order"],
                    "is_primary": bool(m_dict["is_primary"])
                })

            return {"status": "ok", "settings": settings, "models": models}
    except Exception as e:
        log(f"Error in db_get_all_settings: {e}")
        return {"status": "error", "error": str(e)}

def db_save_all_settings(settings_dict):
    try:
        now = int(time.time() * 1000)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            if isinstance(settings_dict, dict):
                for k, v in settings_dict.items():
                    val_json = json.dumps(v) if not isinstance(v, str) else v
                    cursor.execute("""
                        INSERT INTO settings (key, value_json, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(key) DO UPDATE SET
                            value_json=excluded.value_json,
                            updated_at=excluded.updated_at
                    """, (str(k), str(val_json), int(now)))
            conn.commit()
        return {"status": "ok", "updated_at": now}
    except Exception as e:
        log(f"Error in db_save_all_settings: {e}")
        return {"status": "error", "error": str(e)}

def db_save_models(models_list):
    try:
        now = int(time.time() * 1000)
        if not isinstance(models_list, list):
            models_list = []
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM model_configs")
            for idx, m in enumerate(models_list):
                if not isinstance(m, dict):
                    continue
                m_id = m.get("id") or m.get("model_id") or f"model_{idx}"
                name = m.get("name") or m_id
                model_id_val = m.get("id") or m.get("model_id") or m_id
                is_primary = 1 if idx == 0 else 0
                config_json = json.dumps(m)
                cursor.execute("""
                    INSERT INTO model_configs (id, name, model_id, priority_order, is_primary, config_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (f"{m_id}_{idx}", str(name), str(model_id_val), int(idx), int(is_primary), str(config_json), int(now)))
            conn.commit()
        log(f"Saved {len(models_list)} models to SQLite model_configs table")
        return {"status": "ok", "count": len(models_list)}
    except Exception as e:
        log(f"Error in db_save_models: {e}")
        return {"status": "error", "error": str(e)}

def db_get_models():
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM model_configs ORDER BY priority_order ASC")
            rows = cursor.fetchall()
            models = []
            for r in rows:
                m_dict = dict(r)
                models.append({
                    "id": m_dict["model_id"],
                    "name": m_dict["name"],
                    "priority_order": m_dict["priority_order"],
                    "is_primary": bool(m_dict["is_primary"])
                })
            return {"status": "ok", "models": models}
    except Exception as e:
        log(f"Error in db_get_models: {e}")
        return {"status": "error", "error": str(e)}

# ==========================================
# Local PC RPC Handlers (File & Command Access & SQLite)
# ==========================================
def handle_local_rpc(msg):
    action = msg.get("action")
    req_id = msg.get("id")

    if action == "ping":
        return {
            "id": req_id,
            "status": "ok",
            "version": "1.0.0",
            "platform": sys.platform,
            "os_name": os.name,
            "cwd": os.getcwd(),
            "db_path": DB_PATH
        }

    # SQLite RPC Actions
    elif action == "db_save_session":
        res = db_save_session(msg.get("session", {}))
        res["id"] = req_id
        return res

    elif action == "db_get_sessions":
        res = db_get_sessions(msg.get("search", ""))
        res["id"] = req_id
        return res

    elif action == "db_get_session":
        res = db_get_session(msg.get("session_id", ""))
        res["id"] = req_id
        return res

    elif action == "db_delete_session":
        res = db_delete_session(msg.get("session_id", ""))
        res["id"] = req_id
        return res

    elif action == "db_clear_all":
        res = db_clear_all()
        res["id"] = req_id
        return res

    elif action == "db_save_setting":
        res = db_save_setting(msg.get("key"), msg.get("value"))
        res["id"] = req_id
        return res

    elif action == "db_get_setting":
        res = db_get_setting(msg.get("key"))
        res["id"] = req_id
        return res

    elif action == "db_get_all_settings":
        res = db_get_all_settings()
        res["id"] = req_id
        return res

    elif action == "db_save_all_settings":
        res = db_save_all_settings(msg.get("settings", {}))
        res["id"] = req_id
        return res

    elif action == "db_save_models":
        res = db_save_models(msg.get("models", []))
        res["id"] = req_id
        return res

    elif action == "db_get_models":
        res = db_get_models()
        res["id"] = req_id
        return res

    elif action == "db_get_session":
        res = db_get_session(msg.get("session_id", ""))
        res["id"] = req_id
        return res

    elif action == "db_delete_session":
        res = db_delete_session(msg.get("session_id", ""))
        res["id"] = req_id
        return res

    elif action == "db_clear_all":
        res = db_clear_all()
        res["id"] = req_id
        return res

    elif action == "save_generated_image":
        res = save_generated_image(msg.get("image_id"), msg.get("image_data"), msg.get("prompt", ""))
        res["id"] = req_id
        return res

    elif action == "get_generated_image":
        res = get_generated_image(msg.get("image_id"))
        res["id"] = req_id
        return res

    elif action == "save_screenshot":
        res = save_screenshot(msg.get("screenshot_id"), msg.get("image_data"), msg.get("label", ""), msg.get("session_id", ""))
        res["id"] = req_id
        return res

    # Agents RPC Handlers
    elif action == "list_agents":
        res = list_md_items(AGENTS_DIR)
        res["id"] = req_id
        return res

    elif action == "save_agent":
        res = save_md_item(AGENTS_DIR, msg.get("agent", {}))
        res["id"] = req_id
        return res

    elif action == "delete_agent":
        res = delete_md_item(AGENTS_DIR, msg.get("agent_id", ""))
        res["id"] = req_id
        return res

    # Skills RPC Handlers
    elif action == "list_skills":
        res = list_md_items(SKILLS_DIR)
        res["id"] = req_id
        return res

    elif action == "save_skill":
        res = save_md_item(SKILLS_DIR, msg.get("skill", {}))
        res["id"] = req_id
        return res

    elif action == "delete_skill":
        res = delete_md_item(SKILLS_DIR, msg.get("skill_id", ""))
        res["id"] = req_id
        return res

    # Memories RPC Handlers
    elif action == "list_memories":
        res = list_md_items(MEMORIES_DIR)
        res["id"] = req_id
        return res

    elif action == "save_memory":
        res = save_md_item(MEMORIES_DIR, msg.get("memory", {}))
        res["id"] = req_id
        return res

    elif action == "delete_memory":
        res = delete_md_item(MEMORIES_DIR, msg.get("memory_id", ""))
        res["id"] = req_id
        return res

    elif action == "run_command":
        cmd = msg.get("command") or msg.get("cmd")
        cwd = msg.get("cwd") or os.path.expanduser("~")
        timeout = msg.get("timeout", 60)
        
        if not cmd:
            return {"id": req_id, "status": "error", "error": "No command provided"}
            
        try:
            log(f"Executing local command: {cmd} in {cwd}")
            proc = subprocess.run(
                cmd,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                "id": req_id,
                "status": "ok",
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "exit_code": proc.returncode
            }
        except subprocess.TimeoutExpired:
            return {"id": req_id, "status": "error", "error": f"Command timed out after {timeout}s"}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "read_file":
        path = os.path.expanduser(msg.get("path", ""))
        if not path:
            return {"id": req_id, "status": "error", "error": "No file path provided"}
        try:
            if not os.path.exists(path):
                return {"id": req_id, "status": "error", "error": f"File not found: {path}"}
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {"id": req_id, "status": "ok", "content": content, "path": path, "size": len(content)}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "write_file":
        path = os.path.expanduser(msg.get("path", ""))
        content = msg.get("content", "")
        if not path:
            return {"id": req_id, "status": "error", "error": "No file path provided"}
        try:
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"id": req_id, "status": "ok", "path": path, "bytes_written": len(content.encode('utf-8'))}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "list_dir":
        path = os.path.expanduser(msg.get("path") or os.getcwd())
        try:
            if not os.path.exists(path):
                return {"id": req_id, "status": "error", "error": f"Directory not found: {path}"}
            items = []
            for item in sorted(os.listdir(path)):
                full_path = os.path.join(path, item)
                is_dir = os.path.isdir(full_path)
                size = 0 if is_dir else os.path.getsize(full_path) if os.path.exists(full_path) else 0
                items.append({
                    "name": item,
                    "is_dir": is_dir,
                    "size": size,
                    "path": full_path
                })
            return {"id": req_id, "status": "ok", "path": path, "items": items}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "open_file":
        path = os.path.expanduser(msg.get("path", ""))
        if not path:
            return {"id": req_id, "status": "error", "error": "No file path provided"}
        try:
            abs_path = os.path.abspath(path)
            if not os.path.exists(abs_path):
                return {"id": req_id, "status": "error", "error": f"File not found: {path}"}

            log(f"Opening file with default app: {abs_path}")
            if IS_WINDOWS:
                os.startfile(abs_path)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", abs_path])
            else:
                subprocess.Popen(["xdg-open", abs_path])

            return {"id": req_id, "status": "ok", "path": abs_path, "message": "File opened successfully"}
        except Exception as e:
            log(f"Error in open_file: {e}")
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "reveal_file":
        path = os.path.expanduser(msg.get("path", ""))
        if not path:
            return {"id": req_id, "status": "error", "error": "No file path provided"}
        try:
            abs_path = os.path.abspath(path)
            if not os.path.exists(abs_path):
                parent = os.path.dirname(abs_path)
                if os.path.exists(parent):
                    abs_path = parent
                else:
                    return {"id": req_id, "status": "error", "error": f"Path not found: {path}"}

            log(f"Revealing path in file manager: {abs_path}")
            if IS_WINDOWS:
                if os.path.isfile(abs_path):
                    subprocess.Popen(f'explorer /select,"{os.path.normpath(abs_path)}"')
                else:
                    subprocess.Popen(f'explorer "{os.path.normpath(abs_path)}"')
            elif sys.platform == "darwin":
                if os.path.isfile(abs_path):
                    subprocess.Popen(["open", "-R", abs_path])
                else:
                    subprocess.Popen(["open", abs_path])
            else:
                opened = False
                if os.path.isfile(abs_path):
                    try:
                        cmd = [
                            "dbus-send", "--session", "--dest=org.freedesktop.FileManager1",
                            "--type=method_call", "/org/freedesktop/FileManager1",
                            "org.freedesktop.FileManager1.ShowItems",
                            f"array:string:file://{abs_path}", "string:"
                        ]
                        res = subprocess.run(cmd, capture_output=True, timeout=2)
                        if res.returncode == 0:
                            opened = True
                    except Exception:
                        pass

                if not opened:
                    folder = os.path.dirname(abs_path) if os.path.isfile(abs_path) else abs_path
                    subprocess.Popen(["xdg-open", folder])

            return {"id": req_id, "status": "ok", "path": abs_path, "message": "Folder revealed successfully"}
        except Exception as e:
            log(f"Error in reveal_file: {e}")
            return {"id": req_id, "status": "error", "error": str(e)}

    return {"id": req_id, "status": "error", "error": f"Unknown action: {action}"}


def main():
    mcp_process = None
    child_process = None
    pid = None
    fd = None
    running = True

    # 1. Spawn Browser MCP in background
    try:
        log("Starting Browser MCP server...")
        mcp_cmd = ["npx.cmd", "--yes", "@browsermcp/mcp@latest"] if IS_WINDOWS else ["npx", "--yes", "@browsermcp/mcp@latest"]
        
        mcp_process = subprocess.Popen(
            mcp_cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            preexec_fn=None if IS_WINDOWS else os.setsid,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if IS_WINDOWS else 0
        )
        log(f"Browser MCP server started with PID {mcp_process.pid}")
    except Exception as e:
        log(f"Failed to start Browser MCP server: {e}")

    # 2. Spawn Interactive PTY Terminal Shell (bash/zsh or cmd/powershell/agy)
    shell_cmd = "cmd.exe" if IS_WINDOWS else os.environ.get("SHELL", "/bin/bash")
    
    if IS_WINDOWS:
        try:
            log("Spawning child shell process on Windows...")
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE

            child_process = subprocess.Popen(
                [shell_cmd],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                startupinfo=startupinfo,
                shell=True,
                bufsize=0
            )
            log(f"Spawned child shell process with PID {child_process.pid}")
        except Exception as e:
            log(f"Failed to spawn shell: {e}")
    else:
        try:
            pid, fd = pty.fork()
            if pid == 0:
                os.environ['TERM'] = 'xterm-256color'
                os.environ['LANG'] = 'en_US.UTF-8'
                try:
                    os.execvp(shell_cmd, [shell_cmd])
                except Exception as e:
                    sys.stderr.write(f"Failed to execute shell: {e}\n")
                    sys.exit(1)
            log(f"Spawned child shell with PID {pid}, PTY master fd {fd}")
        except Exception as e:
            log(f"Failed to fork pty: {e}")

    # 3. Process cleanup handler
    def cleanup():
        nonlocal running
        running = False
        log("Cleaning up processes...")
        
        if IS_WINDOWS:
            if child_process:
                try:
                    child_process.terminate()
                except Exception:
                    pass
        else:
            if pid:
                try:
                    os.kill(pid, 15)
                except Exception:
                    pass
                
        if mcp_process:
            if IS_WINDOWS:
                try:
                    mcp_process.terminate()
                except Exception:
                    pass
            else:
                try:
                    os.killpg(os.getpgid(mcp_process.pid), 15)
                except Exception:
                    pass

    def sig_handler(signum, frame):
        log(f"Received signal {signum}")
        cleanup()
        sys.exit(0)
        
    signal.signal(signal.SIGTERM, sig_handler)
    signal.signal(signal.SIGINT, sig_handler)

    # 4. Threading to pipe stdin/stdout
    def read_from_pty():
        decoder = codecs.getincrementaldecoder('utf-8')(errors='replace')
        while running:
            try:
                if IS_WINDOWS:
                    if child_process and child_process.stdout:
                        data = child_process.stdout.read(1024)
                    else:
                        time.sleep(0.1)
                        continue
                else:
                    if fd is not None:
                        data = os.read(fd, 4096)
                    else:
                        time.sleep(0.1)
                        continue
                
                if not data:
                    log("PTY output ended (EOF). PTY reader stopping.")
                    break
                
                decoded = decoder.decode(data)
                if decoded:
                    write_message({"data": decoded})
            except Exception as e:
                log(f"PTY read notice: {e}")
                break
        log("PTY reader thread exited cleanly.")

    def read_from_chrome():
        nonlocal running
        while running:
            msg = read_message()
            if msg is None:
                log("Chrome disconnected (stdin EOF). Exiting native host...")
                running = False
                break
            
            try:
                # Handle RPC action commands for local PC tools
                if "action" in msg:
                    try:
                        response = handle_local_rpc(msg)
                    except Exception as rpc_err:
                        log(f"RPC execution error for action '{msg.get('action')}': {rpc_err}\n{traceback.format_exc()}")
                        response = {
                            "id": msg.get("id"),
                            "status": "error",
                            "error": str(rpc_err)
                        }
                    write_message(response)
                    continue

                # Handle raw terminal data
                if "data" in msg:
                    data_bytes = msg["data"].encode('utf-8')
                    if IS_WINDOWS:
                        if child_process and child_process.stdin:
                            child_process.stdin.write(data_bytes)
                            child_process.stdin.flush()
                    else:
                        if fd is not None:
                            try:
                                os.write(fd, data_bytes)
                            except Exception as e:
                                log(f"PTY write notice: {e}")
                elif "resize" in msg:
                    if not IS_WINDOWS and fd is not None:
                        try:
                            cols = msg["resize"].get("cols", 80)
                            rows = msg["resize"].get("rows", 24)
                            size = struct.pack("HHHH", rows, cols, 0, 0)
                            fcntl.ioctl(fd, termios.TIOCSWINSZ, size)
                        except Exception as e:
                            log(f"PTY resize notice: {e}")
            except Exception as e:
                log(f"Error processing chrome message: {e}\n{traceback.format_exc()}")
                continue

    t1 = threading.Thread(target=read_from_pty, daemon=True)
    t2 = threading.Thread(target=read_from_chrome, daemon=True)
    t1.start()
    t2.start()
    
    try:
        t2.join()
    except Exception as e:
        log(f"Join error: {e}")
        
    cleanup()
    log("Native messaging host exiting.")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        log(f"Unhandled main exception: {e}")
        log(traceback.format_exc())
