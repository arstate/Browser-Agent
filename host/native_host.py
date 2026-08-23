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
import tarfile
import io
import base64
import datetime
import shutil
import uuid
import re

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

# Project & Persistent Memory Root Directories
HOST_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(HOST_DIR)
PROJECT_PERSISTENT_MEMORY_DIR = os.path.join(PROJECT_DIR, "PERSISTENT MEMORY")
DB_PERSISTENT_MEMORY_DIR = os.path.join(DB_DIR, "PERSISTENT MEMORY")

# Unified Single-Database Directory: PERSISTENT MEMORY is stored inside ~/.browser-agent/
PERSISTENT_MEMORY_ROOT = DB_PERSISTENT_MEMORY_DIR
PM_USER_PROFILE_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "user_profile")
PM_EXPERIENCE_LEDGER_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "experience_ledger")
PM_ANTI_PATTERNS_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "anti_patterns")
PM_AUTONOMOUS_SKILLS_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "autonomous_skills")
PM_AUTONOMOUS_AGENTS_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "autonomous_agents")
PM_TRAINING_CORPUS_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "training_corpus")

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
        
        # Ensure Persistent Memory directories exist
        os.makedirs(PERSISTENT_MEMORY_ROOT, exist_ok=True)
        os.makedirs(PM_USER_PROFILE_DIR, exist_ok=True)
        os.makedirs(PM_EXPERIENCE_LEDGER_DIR, exist_ok=True)
        os.makedirs(PM_ANTI_PATTERNS_DIR, exist_ok=True)
        os.makedirs(PM_AUTONOMOUS_SKILLS_DIR, exist_ok=True)
        os.makedirs(PM_AUTONOMOUS_AGENTS_DIR, exist_ok=True)
        os.makedirs(PM_TRAINING_CORPUS_DIR, exist_ok=True)

        conn = sqlite3.connect(DB_PATH)
        try:
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

            # Dedicated Model Configurations Table
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

            # 1. User Personal Memories (Profile, Rules, Preferences)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_memories (
                    id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    content TEXT NOT NULL,
                    source TEXT DEFAULT 'autonomous_ai',
                    reason TEXT DEFAULT '',
                    confidence REAL DEFAULT 1.0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_memories_cat ON user_memories(category)")

            # 2. Experience Ledger (Distilled Knowledge Markdown per Session)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS experience_ledger (
                    id TEXT PRIMARY KEY,
                    session_id TEXT DEFAULT '',
                    title TEXT NOT NULL,
                    distilled_markdown TEXT NOT NULL,
                    key_learnings_json TEXT DEFAULT '[]',
                    tags TEXT DEFAULT '',
                    created_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_exp_ledger_created ON experience_ledger(created_at DESC)")

            # 3. Anti-Patterns & Failure Learnings Vault
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS anti_patterns (
                    id TEXT PRIMARY KEY,
                    target_domain TEXT NOT NULL,
                    mistake_description TEXT NOT NULL,
                    root_cause TEXT DEFAULT '',
                    winning_fix TEXT NOT NULL,
                    prevention_rule TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_anti_patterns_domain ON anti_patterns(target_domain)")

            # 4. Autonomous Skills (Self-Created & Self-Refactored Workflows)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS autonomous_skills (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    workflow_markdown TEXT NOT NULL,
                    version TEXT DEFAULT 'v1.0.0',
                    source TEXT DEFAULT 'autonomous_ai',
                    success_count INTEGER DEFAULT 1,
                    failure_count INTEGER DEFAULT 0,
                    changelog TEXT DEFAULT '',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)

            # 5. Autonomous Agents (Self-Created Specialist Personas)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS autonomous_agents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role_description TEXT NOT NULL,
                    system_prompt TEXT NOT NULL,
                    assigned_skills_json TEXT DEFAULT '[]',
                    source TEXT DEFAULT 'autonomous_ai',
                    reason TEXT DEFAULT '',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)

            # 6. Chat History Distilled Markdown Training Corpus (Auto-Training & Fine-Tuning)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_training_corpus (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    model TEXT DEFAULT '',
                    distilled_points_md TEXT NOT NULL,
                    key_intents_json TEXT DEFAULT '[]',
                    tool_workflows_json TEXT DEFAULT '[]',
                    learnings_json TEXT DEFAULT '[]',
                    token_saved_estimate INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_corpus_updated ON chat_training_corpus(updated_at DESC)")

            conn.commit()
            cursor.close()
        finally:
            conn.close()
        
        # Populate initial seeds from markdown if empty
        sync_persistent_memory_on_startup()
        
        log(f"SQLite database initialized at {DB_PATH}, persistent memory tables & directories ready")
    except Exception as e:
        log(f"Failed to initialize SQLite database: {e}\n{traceback.format_exc()}")

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

        # Real-time Autonomous Training Distillation (Knowledge Persistence Independent of Raw Chat)
        if msg_count >= 1:
            try:
                item = distill_session_to_training_md({
                    "id": sid,
                    "title": title,
                    "model": model,
                    "messages_json": messages_json,
                    "created_at": created_at,
                    "updated_at": updated_at
                })
                if item:
                    with sqlite3.connect(DB_PATH) as conn:
                        c = conn.cursor()
                        c.execute("""
                            INSERT INTO chat_training_corpus (id, session_id, title, model, distilled_points_md, key_intents_json, tool_workflows_json, learnings_json, token_saved_estimate, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                title=excluded.title,
                                model=excluded.model,
                                distilled_points_md=excluded.distilled_points_md,
                                key_intents_json=excluded.key_intents_json,
                                tool_workflows_json=excluded.tool_workflows_json,
                                learnings_json=excluded.learnings_json,
                                token_saved_estimate=excluded.token_saved_estimate,
                                updated_at=excluded.updated_at
                        """, (
                            item["id"], item["session_id"], item["title"], item["model"],
                            item["distilled_points_md"], json.dumps(item["key_intents"]),
                            json.dumps(item["tool_workflows"]), json.dumps(item["learnings"]),
                            item["token_saved_estimate"], item["created_at"], updated_at
                        ))
                        conn.commit()

                    safe_sid = re.sub(r'[^a-zA-Z0-9_-]', '_', sid)
                    fpath = os.path.join(PM_TRAINING_CORPUS_DIR, f"{safe_sid}.md")
                    os.makedirs(PM_TRAINING_CORPUS_DIR, exist_ok=True)
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(item["distilled_points_md"])
            except Exception as e_dist:
                log(f"Auto-distill in db_save_session ignored error: {e_dist}")

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
def db_export_full_database():
    try:
        now = int(time.time() * 1000)
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 1. Sessions
            cursor.execute("SELECT id, title, model, message_count, preview, messages_json, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
            s_rows = cursor.fetchall()
            sessions = [dict(r) for r in s_rows]
            
            # 2. Settings
            cursor.execute("SELECT key, value_json, updated_at FROM settings ORDER BY key ASC")
            st_rows = cursor.fetchall()
            settings = {}
            for r in st_rows:
                k = r["key"]
                try:
                    settings[k] = json.loads(r["value_json"])
                except Exception:
                    settings[k] = r["value_json"]
            
            # 3. Models
            cursor.execute("SELECT id, name, model_id, priority_order, is_primary, config_json, updated_at FROM model_configs ORDER BY priority_order ASC")
            m_rows = cursor.fetchall()
            models = []
            for r in m_rows:
                md = dict(r)
                try:
                    md["config"] = json.loads(md.get("config_json", "{}"))
                except Exception:
                    md["config"] = {}
                models.append(md)

        # 4. Custom agents, skills, memories files
        agents = []
        skills = []
        memories = []
        
        for dir_path, arr in [(AGENTS_DIR, agents), (SKILLS_DIR, skills), (MEMORIES_DIR, memories)]:
            if os.path.exists(dir_path):
                for f in os.listdir(dir_path):
                    if f.endswith(".md"):
                        full_f = os.path.join(dir_path, f)
                        try:
                            with open(full_f, "r", encoding="utf-8") as file_obj:
                                arr.append({"filename": f, "content": file_obj.read()})
                        except Exception as fe:
                            log(f"Error reading file {full_f}: {fe}")

        export_payload = {
            "meta": {
                "app": "Browser Agent",
                "version": "v2.88.0",
                "export_type": "universal_full_database_backup",
                "platform_origin": sys.platform,
                "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
                "timestamp": now,
                "counts": {
                    "sessions": len(sessions),
                    "settings": len(settings),
                    "models": len(models),
                    "agents": len(agents),
                    "skills": len(skills),
                    "memories": len(memories)
                }
            },
            "database": {
                "sessions": sessions,
                "settings": settings,
                "models": models
            },
            "files": {
                "agents": agents,
                "skills": skills,
                "memories": memories
            }
        }
        return {"status": "ok", "data": export_payload}
    except Exception as e:
        log(f"Error in db_export_full_database: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

def db_import_full_database(payload):
    try:
        if not isinstance(payload, dict):
            return {"status": "error", "error": "Invalid payload"}
        
        db_data = payload.get("database") or payload
        sessions = db_data.get("sessions") or []
        settings = db_data.get("settings") or {}
        models = db_data.get("models") or []
        files = payload.get("files") or {}

        now = int(time.time() * 1000)
        imported_sessions = 0
        imported_settings = 0
        imported_models = 0
        imported_files = 0

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()

            # 1. Restore Sessions
            if isinstance(sessions, list):
                for s in sessions:
                    if not isinstance(s, dict) or not s.get("id"):
                        continue
                    sid = s.get("id")
                    title = s.get("title") or "Untitled Session"
                    model = s.get("model") or "auto"
                    msg_count = s.get("message_count") or 0
                    preview = s.get("preview") or ""
                    messages_json = s.get("messages_json")
                    if messages_json is None:
                        messages_json = json.dumps(s.get("messages") or [])
                    elif not isinstance(messages_json, str):
                        messages_json = json.dumps(messages_json)
                    c_at = s.get("created_at") or now
                    u_at = s.get("updated_at") or now

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
                    """, (str(sid), str(title), str(model), int(msg_count), str(preview), str(messages_json), int(c_at), int(u_at)))
                    imported_sessions += 1

            # 2. Restore Settings
            if isinstance(settings, dict):
                for k, v in settings.items():
                    val_json = json.dumps(v) if not isinstance(v, str) else v
                    cursor.execute("""
                        INSERT INTO settings (key, value_json, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(key) DO UPDATE SET
                            value_json=excluded.value_json,
                            updated_at=excluded.updated_at
                    """, (str(k), str(val_json), int(now)))
                    imported_settings += 1

            # 3. Restore Models
            if isinstance(models, list) and len(models) > 0:
                cursor.execute("DELETE FROM model_configs")
                for idx, m in enumerate(models):
                    if not isinstance(m, dict):
                        continue
                    m_id = m.get("id") or m.get("model_id") or f"model_{idx}"
                    name = m.get("name") or m_id
                    model_id_val = m.get("model_id") or m.get("id") or m_id
                    is_primary = m.get("is_primary", 1 if idx == 0 else 0)
                    p_order = m.get("priority_order", idx)
                    config_json = json.dumps(m.get("config") or m)
                    cursor.execute("""
                        INSERT INTO model_configs (id, name, model_id, priority_order, is_primary, config_json, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (f"{m_id}_{idx}", str(name), str(model_id_val), int(p_order), int(is_primary), str(config_json), int(now)))
                    imported_models += 1

            conn.commit()

        # 4. Restore files (Agents, Skills, Memories)
        for dir_path, key in [(AGENTS_DIR, "agents"), (SKILLS_DIR, "skills"), (MEMORIES_DIR, "memories")]:
            arr = files.get(key) or []
            if isinstance(arr, list):
                os.makedirs(dir_path, exist_ok=True)
                for item in arr:
                    if isinstance(item, dict) and item.get("filename") and item.get("content"):
                        clean_fname = os.path.basename(item["filename"])
                        target_f = os.path.join(dir_path, clean_fname)
                        try:
                            with open(target_f, "w", encoding="utf-8") as fo:
                                fo.write(item["content"])
                            imported_files += 1
                        except Exception as werr:
                            log(f"Error writing imported file {target_f}: {werr}")

        log(f"Universal DB Import Success: {imported_sessions} sessions, {imported_settings} settings, {imported_models} models, {imported_files} files")
        return {
            "status": "ok",
            "imported": {
                "sessions": imported_sessions,
                "settings": imported_settings,
                "models": imported_models,
                "files": imported_files
            }
        }
    except Exception as e:
        log(f"Error in db_import_full_database: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

# Chunked upload buffer in memory
_chunked_upload_buffer = {
    "filename": "",
    "total_chunks": 0,
    "total_bytes": 0,
    "chunks": {},
    "started_at": 0
}

def db_export_targz_backup(chrome_storage_dict=None):
    try:
        now = int(time.time() * 1000)
        date_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
        filename = f"browser-agent-full-database-{date_str}.tar.gz"
        
        # Write to user's Downloads directory directly
        downloads_dir = os.path.expanduser("~/Downloads")
        saved_file_path = None
        
        # Ensure DB_DIR exists
        if not os.path.exists(DB_DIR):
            os.makedirs(DB_DIR, exist_ok=True)
            init_db()

        # Temporary tar archive file on disk to avoid memory spikes
        temp_tar_path = os.path.join(DB_DIR, f".tmp_export_{now}.tar.gz")
        
        counts = {
            "sessions": 0,
            "skills": 0,
            "memories": 0,
            "agents": 0,
            "images": 0,
            "screenshots": 0,
            "total_items": 0
        }
        
        with tarfile.open(temp_tar_path, mode="w:gz") as tar:
            # 1. Add storage_settings.json
            if chrome_storage_dict:
                settings_bytes = json.dumps(chrome_storage_dict, indent=2).encode('utf-8')
                ti = tarfile.TarInfo(name="storage_settings.json")
                ti.size = len(settings_bytes)
                ti.mtime = int(time.time())
                tar.addfile(ti, io.BytesIO(settings_bytes))

            # 2. Add chat_history.db explicitly
            if os.path.exists(DB_PATH):
                tar.add(DB_PATH, arcname="chat_history.db")
                counts["sessions"] = 1

            # 3. Add ALL files and subdirectories from ~/.browser-agent
            for item in os.listdir(DB_DIR):
                if item in ["storage_settings.json", "chat_history.db", f".tmp_export_{now}.tar.gz"]:
                    continue
                full_item_path = os.path.join(DB_DIR, item)
                if os.path.exists(full_item_path):
                    tar.add(full_item_path, arcname=item)
                    counts["total_items"] += 1
                    if item == "skills" and os.path.isdir(full_item_path):
                        counts["skills"] = len(os.listdir(full_item_path))
                    elif item == "memories" and os.path.isdir(full_item_path):
                        counts["memories"] = len(os.listdir(full_item_path))
                    elif item == "agents" and os.path.isdir(full_item_path):
                        counts["agents"] = len(os.listdir(full_item_path))
                    elif item == "generated_images" and os.path.isdir(full_item_path):
                        counts["images"] = len(os.listdir(full_item_path))
                    elif item == "walkthrough_screenshots" and os.path.isdir(full_item_path):
                        counts["screenshots"] = len(os.listdir(full_item_path))

        file_size_bytes = os.path.getsize(temp_tar_path)

        # Copy to Downloads directory
        if os.path.exists(downloads_dir):
            dest_path = os.path.join(downloads_dir, filename)
            try:
                shutil.copy2(temp_tar_path, dest_path)
                saved_file_path = dest_path
                log(f"Exported full tar.gz backup directly to Downloads: {dest_path} ({file_size_bytes} bytes)")
            except Exception as d_err:
                log(f"Warning copying to Downloads: {d_err}")
                saved_file_path = temp_tar_path
        else:
            saved_file_path = temp_tar_path

        # If file is small (< 700KB), return base64 for browser in-memory download.
        # If file is large (>= 700KB), omit base64 to respect Chrome Native Messaging 1MB limit.
        b64_data = None
        if file_size_bytes < 700 * 1024:
            with open(temp_tar_path, "rb") as f_in:
                b64_data = base64.b64encode(f_in.read()).decode('ascii')

        # Clean up temp file if copied to downloads
        if saved_file_path != temp_tar_path and os.path.exists(temp_tar_path):
            try:
                os.remove(temp_tar_path)
            except Exception:
                pass

        return {
            "status": "ok",
            "tar_gz_b64": b64_data,
            "filename": filename,
            "saved_file_path": saved_file_path,
            "size_bytes": file_size_bytes,
            "counts": counts
        }
    except Exception as e:
        log(f"Error in db_export_targz_backup: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

def _extract_tar_archive(tar_obj):
    restored_storage = {}
    extracted_count = 0
    
    # Extract storage_settings.json
    try:
        member = tar_obj.getmember("storage_settings.json")
        f = tar_obj.extractfile(member)
        if f:
            restored_storage = json.loads(f.read().decode('utf-8'))
    except Exception:
        pass

    for member in tar_obj.getmembers():
        if member.name == "storage_settings.json":
            continue
        # Safe path resolution (prevent path traversal)
        target_path = os.path.abspath(os.path.join(DB_DIR, member.name))
        if not target_path.startswith(os.path.abspath(DB_DIR)):
            continue

        if member.isdir():
            os.makedirs(target_path, exist_ok=True)
        elif member.isfile():
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "wb") as out_f:
                f = tar_obj.extractfile(member)
                if f:
                    out_f.write(f.read())
            extracted_count += 1

    init_db()
    return restored_storage, extracted_count

def db_import_targz_backup(tar_gz_b64):
    try:
        raw_bytes = base64.b64decode(tar_gz_b64)
        buf = io.BytesIO(raw_bytes)
        with tarfile.open(fileobj=buf, mode="r:gz") as tar:
            restored_storage, extracted_count = _extract_tar_archive(tar)

        log(f"Imported tar.gz successfully into {DB_DIR} ({extracted_count} files extracted)")
        return {
            "status": "ok",
            "extracted_count": extracted_count,
            "storage": restored_storage
        }
    except Exception as e:
        log(f"Error in db_import_targz_backup: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

def db_import_targz_from_path(file_path):
    try:
        expanded_path = os.path.expanduser(file_path)
        if not os.path.exists(expanded_path):
            return {"status": "error", "error": f"File not found: {file_path}"}
        
        with tarfile.open(expanded_path, mode="r:gz") as tar:
            restored_storage, extracted_count = _extract_tar_archive(tar)

        log(f"Imported tar.gz from {file_path} successfully into {DB_DIR} ({extracted_count} files extracted)")
        return {
            "status": "ok",
            "extracted_count": extracted_count,
            "storage": restored_storage
        }
    except Exception as e:
        log(f"Error in db_import_targz_from_path: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

def db_import_chunk_start(filename, total_chunks, total_bytes):
    global _chunked_upload_buffer
    _chunked_upload_buffer = {
        "filename": filename or "backup.tar.gz",
        "total_chunks": int(total_chunks or 1),
        "total_bytes": int(total_bytes or 0),
        "chunks": {},
        "started_at": time.time()
    }
    log(f"Started chunked upload: {filename} ({total_chunks} chunks, {total_bytes} bytes)")
    return {"status": "ok", "message": "Chunk upload session started"}

def db_import_chunk_data(chunk_index, chunk_b64):
    global _chunked_upload_buffer
    idx = int(chunk_index)
    _chunked_upload_buffer["chunks"][idx] = chunk_b64
    received = len(_chunked_upload_buffer["chunks"])
    total = _chunked_upload_buffer["total_chunks"]
    return {"status": "ok", "received_chunks": received, "total_chunks": total}

def db_import_chunk_finish():
    global _chunked_upload_buffer
    try:
        total = _chunked_upload_buffer["total_chunks"]
        chunks_map = _chunked_upload_buffer["chunks"]
        if len(chunks_map) < total:
            return {"status": "error", "error": f"Incomplete chunks: received {len(chunks_map)} of {total}"}

        # Reassemble byte chunks
        full_bytes = bytearray()
        for i in range(total):
            b64_part = chunks_map.get(i, "")
            part_bytes = base64.b64decode(b64_part)
            full_bytes.extend(part_bytes)

        buf = io.BytesIO(full_bytes)
        with tarfile.open(fileobj=buf, mode="r:gz") as tar:
            restored_storage, extracted_count = _extract_tar_archive(tar)

        _chunked_upload_buffer = {"filename": "", "total_chunks": 0, "total_bytes": 0, "chunks": {}, "started_at": 0}
        log(f"Reassembled and restored chunked tar.gz: {extracted_count} files extracted")
        return {
            "status": "ok",
            "extracted_count": extracted_count,
            "storage": restored_storage
        }
    except Exception as e:
        log(f"Error in db_import_chunk_finish: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

# ==========================================
# Persistent Memory & Knowledge Ledger Engine
# ==========================================

def sync_personal_facts_markdown():
    """Rebuilds personal_facts.md from SQLite user_memories table"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_memories ORDER BY category ASC, updated_at DESC")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        conn = None

        os.makedirs(PM_USER_PROFILE_DIR, exist_ok=True)
        fpath = os.path.join(PM_USER_PROFILE_DIR, "personal_facts.md")

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M WIB")
        lines = [
            "# 👤 Profil Pengguna & Aturan Personal (Personal Facts)",
            f"*Terakhir Diperbarui: {now_str} | Source: Autonomous AI & User Directives*\n",
            "---",
            "\n## 📌 Fakta & Preferensi Utama Pengguna"
        ]

        facts = [r for r in rows if r["category"] in ("profile", "preference", "knowledge")]
        rules = [r for r in rows if r["category"] in ("rule", "guideline")]

        if facts:
            for r in facts:
                src_badge = "[🤖 AI]" if r["source"] == "autonomous_ai" else "[👤 User]"
                reason_str = f" *(Alasan: {r['reason']})*" if r["reason"] else ""
                lines.append(f"- **{src_badge} {r['content']}**{reason_str}")
        else:
            lines.append("- *(Belum ada preferensi khusus tercatat)*")

        lines.append("\n---\n\n## 🔒 Aturan Kerja & Protokol Baku (Permanent Guidelines)")
        if rules:
            for idx, r in enumerate(rules, 1):
                src_badge = "[🤖 AI Rule]" if r["source"] == "autonomous_ai" else "[👤 User Rule]"
                reason_str = f" *(Alasan: {r['reason']})*" if r["reason"] else ""
                lines.append(f"{idx}. **{src_badge} {r['content']}**{reason_str}")
        else:
            lines.append("1. *(Belum ada aturan baku khusus tercatat)*")

        with open(fpath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        return True
    except Exception as e:
        log(f"Error syncing personal facts markdown: {e}")
        return False
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def sync_failure_learnings_markdown():
    """Rebuilds failure_learnings.md from SQLite anti_patterns table"""
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM anti_patterns ORDER BY created_at DESC")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        conn = None

        os.makedirs(PM_ANTI_PATTERNS_DIR, exist_ok=True)
        fpath = os.path.join(PM_ANTI_PATTERNS_DIR, "failure_learnings.md")

        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M WIB")
        lines = [
            "# 🛡️ Anti-Pattern Vault & Failure Learnings (Pelajaran dari Kesalahan)",
            f"*Kumpulan catatan kesalahan masa lalu, diagnosa akar masalah, dan solusi permanen yang dipelajari secara otonom oleh AI.*",
            f"*Terakhir Diperbarui: {now_str} | Total Learned: {len(rows)} Anti-Patterns*\n",
            "---"
        ]

        for idx, r in enumerate(rows, 1):
            lines.extend([
                f"\n### ⚠️ [AP-{idx:03d}] {r['mistake_description']}",
                f"- **Target / Konteks:** {r['target_domain']}",
                f"- **Gejala Kesalahan:** {r['mistake_description']}",
                f"- **Root Cause (Akar Masalah):** {r['root_cause'] or 'N/A'}",
                f"- **Solusi Permanen (Winning Fix):** {r['winning_fix']}",
                f"- **Aturan Pencegahan:** {r['prevention_rule']}",
                "\n---"
            ])

        with open(fpath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        return True
    except Exception as e:
        log(f"Error syncing failure learnings markdown: {e}")
        return False
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def sync_persistent_memory_on_startup():
    """Scans PERSISTENT MEMORY folders on startup and ensures SQLite is populated"""
    conn = None
    try:
        now = int(time.time() * 1000)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Sync Autonomous Skills from markdown files
        if os.path.exists(PM_AUTONOMOUS_SKILLS_DIR):
            for f in os.listdir(PM_AUTONOMOUS_SKILLS_DIR):
                if f.endswith(".md"):
                    fpath = os.path.join(PM_AUTONOMOUS_SKILLS_DIR, f)
                    parsed = parse_md_file(fpath)
                    if parsed and parsed.get("meta"):
                        meta = parsed["meta"]
                        skid = meta.get("id") or f.replace(".md", "")
                        name = meta.get("name") or skid
                        desc = meta.get("description") or ""
                        ver = meta.get("version") or "v1.0.0"
                        src = meta.get("source") or "autonomous_ai"
                        succ = int(meta.get("success_count") or 1)
                        fail = int(meta.get("failure_count") or 0)
                        clog = str(meta.get("changelog") or "")
                        cat = int(meta.get("created_at") or now)
                        uat = int(meta.get("updated_at") or now)
                        body = parsed.get("content") or ""

                        cursor.execute("""
                            INSERT INTO autonomous_skills (id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                name=excluded.name,
                                description=excluded.description,
                                workflow_markdown=excluded.workflow_markdown,
                                version=excluded.version
                        """, (skid, name, desc, body, ver, src, succ, fail, clog, cat, uat))

        # 2. Sync Autonomous Agents from markdown files
        if os.path.exists(PM_AUTONOMOUS_AGENTS_DIR):
            for f in os.listdir(PM_AUTONOMOUS_AGENTS_DIR):
                if f.endswith(".md"):
                    fpath = os.path.join(PM_AUTONOMOUS_AGENTS_DIR, f)
                    parsed = parse_md_file(fpath)
                    if parsed and parsed.get("meta"):
                        meta = parsed["meta"]
                        agid = meta.get("id") or f.replace(".md", "")
                        name = meta.get("name") or agid
                        desc = meta.get("description") or ""
                        prompt = parsed.get("content") or ""
                        skills_list = meta.get("assigned_skills") or []
                        skills_json = json.dumps(skills_list) if isinstance(skills_list, list) else str(skills_list)
                        src = meta.get("source") or "autonomous_ai"
                        reason = meta.get("reason") or ""
                        cat = int(meta.get("created_at") or now)
                        uat = int(meta.get("updated_at") or now)

                        cursor.execute("""
                            INSERT INTO autonomous_agents (id, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                name=excluded.name,
                                role_description=excluded.role_description,
                                system_prompt=excluded.system_prompt,
                                assigned_skills_json=excluded.assigned_skills_json
                        """, (agid, name, desc, prompt, skills_json, src, reason, cat, uat))

        # Seed Core High-Precision Autonomous Skills
        seed_skills = [
            (
                "skill_auto_wa_qualification_sop",
                "WhatsApp 5-Minute Lead Qualification SOP",
                "Standar operasional kualifikasi prospek chat WhatsApp 5 menit: budget, lokasi minat Surabaya/Sidoarjo, kesiapan berkas KPR, dan locking survei.",
                """### 1. Sapaan Ramah & Value Hook (Balon 1 & 2):
- Sapa nama prospek secara ramah dan personal.
- Paparkan Hero Offer: DP 0%, Cicilan ringan 1-2 Jt-an, dan All-In Free (BPHTB, AJB, Notaris, Subsidi KPR).

### 2. Kualifikasi Cepat (5 Menit):
- Tanyakan lokasi kerja & preferensi area (Surabaya Timur/Selatan atau Sidoarjo Juanda/Sukodono).
- Tanyakan estimasi cicilan yang nyaman & kesiapan berkas KPR (Karyawan/Wiraswasta).

### 3. Micro-CTA Kunci Survei Lokasi (Balon 3):
- Berikan 2 opsi waktu luang: *"Mau saya temenin cek lokasinya Sabtu sore atau Minggu pagi kak?"*
- Dampingi langsung saat survei unit di lokasi."""
            ),
            (
                "skill_auto_survey_booking_closer",
                "Survey Booking & Objection Handling Closer",
                "Strategi psikologi closing anti-price shock untuk memecah cicilan bulanan jadi harian setara ngopi dan penguncian jadwal survei unit properti.",
                """### 1. Handling Keberatan Harga (Anti-Price Shock):
- Pecah nominal cicilan rumah ratusan juta menjadi hitungan harian super ringan setara ngopi (Rp 40rb-60rb/hari).
- Bandingkan uang hangus sewa/kontrakan vs cicilan rumah milik sendiri yang menjadi aset masa depan.

### 2. Information Gap Protocol:
- Jaga rasa penasaran prospek, simpan nama persis cluster untuk diinformasikan saat penjemputan survei di titik temu."""
            )
        ]
        for skid, skname, skdesc, skflow in seed_skills:
            cursor.execute("""
                INSERT INTO autonomous_skills (id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'v1.0.0', 'autonomous_ai', 1, 0, 'Core autonomous skill', ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    description=excluded.description,
                    workflow_markdown=excluded.workflow_markdown
            """, (skid, skname, skdesc, skflow, now, now))
            
            sk_fname = f"{skid}.md"
            sk_fpath = os.path.join(PM_AUTONOMOUS_SKILLS_DIR, sk_fname)
            os.makedirs(PM_AUTONOMOUS_SKILLS_DIR, exist_ok=True)
            with open(sk_fpath, "w", encoding="utf-8") as sk_f:
                sk_f.write(f"""---
id: {skid}
name: "{skname}"
type: autonomous_skill
version: "v1.0.0"
description: "{skdesc}"
source: "autonomous_ai"
success_count: 1
failure_count: 0
created_at: {now}
updated_at: {now}
---

# ⚡ {skname} (v1.0.0)

## 🎯 Deskripsi & Trigger:
{skdesc}

## 📋 Prosedur Langkah demi Langkah (SOP / Workflow):
{skflow}
""")

        # Ensure all existing agents are connected to dedicated skills
        cursor.execute("SELECT id, name, role_description, assigned_skills_json FROM autonomous_agents")
        existing_agents = cursor.fetchall()
        for ag_row in existing_agents:
            ag_id, ag_name, ag_desc, ag_skills_json = ag_row
            try: ag_skills = json.loads(ag_skills_json) if ag_skills_json else []
            except Exception: ag_skills = []
            
            if not ag_skills:
                if "lead" in ag_name.lower() or "qualif" in ag_name.lower() or "sales" in ag_name.lower():
                    ag_skills = ["skill_auto_wa_qualification_sop", "skill_auto_survey_booking_closer"]
                else:
                    ag_skills = ["skill_auto_meta_ads_auditor", "skill_auto_wa_qualification_sop"]
                
                cursor.execute("UPDATE autonomous_agents SET assigned_skills_json = ? WHERE id = ?", (json.dumps(ag_skills), ag_id))

        # 3. Seed personal memories if table empty
        cursor.execute("SELECT COUNT(*) FROM user_memories")
        if cursor.fetchone()[0] == 0:
            seed_memories = [
                ("mem_user_name", "profile", "Nama panggilan user adalah Arya / Bro.", "user", "Identitas pengguna", 1.0),
                ("mem_biz_role", "profile", "Developer & Marketer Properti Tiar Property Surabaya-Sidoarjo dan Software Architect.", "user", "Domain bisnis pengguna", 1.0),
                ("mem_comms_style", "preference", "Gaya respon: Santai, akrab ('Bro/Kak'), to the point, padat informasi (high signal), zero AI slop.", "user", "Preferensi komunikasi", 1.0),
                ("mem_backup_format", "rule", "Format backup percakapan wajib selalu .zip (bukan .tar.gz) lengkap dengan folder brain dan seluruh aset gambar paste/upload user.", "user", "Aturan permanen backup", 1.0),
                ("mem_tiar_confidentiality", "rule", "Kerahasiaan Properti: Dilarang sebut kata BLT/komisi internal marketing ke calon pembeli, gunakan Information Gap Protocol untuk booking survei.", "user", "Protokol bisnis Tiar Property", 1.0)
            ]
            for mid, cat, content, src, reason, conf in seed_memories:
                cursor.execute("""
                    INSERT INTO user_memories (id, category, content, source, reason, confidence, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (mid, cat, content, src, reason, conf, now, now))

        # 4. Seed anti-patterns if table empty
        cursor.execute("SELECT COUNT(*) FROM anti_patterns")
        if cursor.fetchone()[0] == 0:
            seed_aps = [
                ("ap_gitignore_zip", "GitHub Backup", "File arsip .zip sesi percakapan terabaikan oleh git.", "Aturan *.zip tanpa whitelist", "Tambahkan !antigravity_session/*.zip di .gitignore", "Periksa git status sebelum konfirmasi push"),
                ("ap_image_persistence", "Chat History", "Thumbnail gambar upload/paste user rusak saat resume session.", "Gambar user tidak disimpan ke IndexedDB dan terpotong di storage", "Gunakan saveAttachmentsToIndexedDB dengan key att_img_... dan auto-hydration di hydrateLocalImages", "Jangan hanya andalkan base64 inline untuk media besar")
            ]
            for apid, domain, mistake, cause, fix, rule in seed_aps:
                cursor.execute("""
                    INSERT INTO anti_patterns (id, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (apid, domain, mistake, cause, fix, rule, now))

        # 5. Full Autonomous Auto-Distillation: Distill any undrained sessions on startup
        try:
            cursor.execute("SELECT id, title, model, messages_json, created_at, updated_at FROM sessions")
            all_sess = cursor.fetchall()
            for s in all_sess:
                s_id, s_title, s_model, s_msg_json, s_created, s_updated = s
                cursor.execute("SELECT id FROM chat_training_corpus WHERE session_id = ?", (s_id,))
                if not cursor.fetchone():
                    d_item = distill_session_to_training_md({
                        "id": s_id, "title": s_title, "model": s_model,
                        "messages_json": s_msg_json, "created_at": s_created, "updated_at": s_updated
                    })
                    if d_item:
                        cursor.execute("""
                            INSERT INTO chat_training_corpus (id, session_id, title, model, distilled_points_md, key_intents_json, tool_workflows_json, learnings_json, token_saved_estimate, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET
                                distilled_points_md=excluded.distilled_points_md,
                                updated_at=excluded.updated_at
                        """, (
                            d_item["id"], d_item["session_id"], d_item["title"], d_item["model"],
                            d_item["distilled_points_md"], json.dumps(d_item["key_intents"]),
                            json.dumps(d_item["tool_workflows"]), json.dumps(d_item["learnings"]),
                            d_item["token_saved_estimate"], d_item["created_at"], s_updated
                        ))
                        safe_sid = re.sub(r'[^a-zA-Z0-9_-]', '_', s_id)
                        fpath = os.path.join(PM_TRAINING_CORPUS_DIR, f"{safe_sid}.md")
                        os.makedirs(PM_TRAINING_CORPUS_DIR, exist_ok=True)
                        with open(fpath, "w", encoding="utf-8") as f:
                            f.write(d_item["distilled_points_md"])
        except Exception as e_dist:
            log(f"Auto-distill on startup error: {e_dist}")

        conn.commit()
    except Exception as e:
        log(f"Error in sync_persistent_memory_on_startup: {e}\n{traceback.format_exc()}")
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_get_persistent_memory(search=""):
    conn = None
    try:
        q = f"%{search.strip().lower()}%" if search and search.strip() else None
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1. User Memories
        if q:
            cursor.execute("SELECT * FROM user_memories WHERE LOWER(content) LIKE ? OR LOWER(category) LIKE ? ORDER BY updated_at DESC", (q, q))
        else:
            cursor.execute("SELECT * FROM user_memories ORDER BY updated_at DESC")
        user_memories = [dict(r) for r in cursor.fetchall()]

        # 2. Experience Ledger
        if q:
            cursor.execute("SELECT * FROM experience_ledger WHERE LOWER(title) LIKE ? OR LOWER(distilled_markdown) LIKE ? ORDER BY created_at DESC", (q, q))
        else:
            cursor.execute("SELECT * FROM experience_ledger ORDER BY created_at DESC")
        experience_ledger = []
        for r in cursor.fetchall():
            item = dict(r)
            try:
                item["key_learnings"] = json.loads(item.get("key_learnings_json") or "[]")
            except Exception:
                item["key_learnings"] = []
            experience_ledger.append(item)

        # 3. Anti Patterns
        if q:
            cursor.execute("SELECT * FROM anti_patterns WHERE LOWER(target_domain) LIKE ? OR LOWER(mistake_description) LIKE ? OR LOWER(winning_fix) LIKE ? ORDER BY created_at DESC", (q, q, q))
        else:
            cursor.execute("SELECT * FROM anti_patterns ORDER BY created_at DESC")
        anti_patterns = [dict(r) for r in cursor.fetchall()]

        # 4. Autonomous Skills
        if q:
            cursor.execute("SELECT * FROM autonomous_skills WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(workflow_markdown) LIKE ? ORDER BY updated_at DESC", (q, q, q))
        else:
            cursor.execute("SELECT * FROM autonomous_skills ORDER BY updated_at DESC")
        autonomous_skills = [dict(r) for r in cursor.fetchall()]

        # 5. Autonomous Agents
        if q:
            cursor.execute("SELECT * FROM autonomous_agents WHERE LOWER(name) LIKE ? OR LOWER(role_description) LIKE ? ORDER BY updated_at DESC", (q, q))
        else:
            cursor.execute("SELECT * FROM autonomous_agents ORDER BY updated_at DESC")
        autonomous_agents = []
        for r in cursor.fetchall():
            item = dict(r)
            try:
                item["assigned_skills"] = json.loads(item.get("assigned_skills_json") or "[]")
            except Exception:
                item["assigned_skills"] = []
            autonomous_agents.append(item)

        # 6. Chat History Distilled Training Corpus
        if q:
            cursor.execute("SELECT * FROM chat_training_corpus WHERE LOWER(title) LIKE ? OR LOWER(distilled_points_md) LIKE ? ORDER BY updated_at DESC", (q, q))
        else:
            cursor.execute("SELECT * FROM chat_training_corpus ORDER BY updated_at DESC")
        training_corpus = []
        for r in cursor.fetchall():
            item = dict(r)
            try:
                item["key_intents"] = json.loads(item.get("key_intents_json") or "[]")
                item["tool_workflows"] = json.loads(item.get("tool_workflows_json") or "[]")
                item["learnings"] = json.loads(item.get("learnings_json") or "[]")
            except Exception:
                item["key_intents"] = []
                item["tool_workflows"] = []
                item["learnings"] = []
            training_corpus.append(item)

        cursor.close()
        return {
            "status": "ok",
            "user_memories": user_memories,
            "experience_ledger": experience_ledger,
            "anti_patterns": anti_patterns,
            "autonomous_skills": autonomous_skills,
            "autonomous_agents": autonomous_agents,
            "training_corpus": training_corpus,
            "counts": {
                "user_memories": len(user_memories),
                "experience_ledger": len(experience_ledger),
                "anti_patterns": len(anti_patterns),
                "autonomous_skills": len(autonomous_skills),
                "autonomous_agents": len(autonomous_agents),
                "training_corpus": len(training_corpus)
            }
        }
    except Exception as e:
        log(f"Error in db_get_persistent_memory: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_save_personal_memory(mem):
    conn = None
    try:
        if not isinstance(mem, dict):
            return {"status": "error", "error": "Invalid memory item"}
        
        now = int(time.time() * 1000)
        mid = str(mem.get("id") or f"mem_{now}_{uuid.uuid4().hex[:6]}")
        category = str(mem.get("category") or "preference")
        content = str(mem.get("content") or "").strip()
        source = str(mem.get("source") or "autonomous_ai")
        reason = str(mem.get("reason") or "")
        confidence = float(mem.get("confidence") or 1.0)
        created_at = int(mem.get("created_at") or now)
        updated_at = now

        if not content:
            return {"status": "error", "error": "Memory content cannot be empty"}

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO user_memories (id, category, content, source, reason, confidence, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                category=excluded.category,
                content=excluded.content,
                source=excluded.source,
                reason=excluded.reason,
                confidence=excluded.confidence,
                updated_at=excluded.updated_at
        """, (mid, category, content, source, reason, confidence, created_at, updated_at))
        conn.commit()
        cursor.close()
        conn.close()
        conn = None

        # Dual-sync to personal_facts.md
        sync_personal_facts_markdown()

        return {"status": "ok", "id": mid, "category": category, "content": content}
    except Exception as e:
        log(f"Error in db_save_personal_memory: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_save_experience_distillation(dist):
    conn = None
    try:
        if not isinstance(dist, dict):
            return {"status": "error", "error": "Invalid distillation item"}
        
        now = int(time.time() * 1000)
        eid = str(dist.get("id") or f"exp_{now}_{uuid.uuid4().hex[:6]}")
        session_id = str(dist.get("session_id") or "")
        title = str(dist.get("title") or "Session Experience").strip()
        distilled_markdown = str(dist.get("distilled_markdown") or "").strip()
        key_learnings = dist.get("key_learnings") or []
        key_learnings_json = json.dumps(key_learnings) if not isinstance(key_learnings, str) else key_learnings
        tags = str(dist.get("tags") or "")
        created_at = int(dist.get("created_at") or now)

        if not distilled_markdown:
            return {"status": "error", "error": "Distilled markdown cannot be empty"}

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO experience_ledger (id, session_id, title, distilled_markdown, key_learnings_json, tags, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                session_id=excluded.session_id,
                title=excluded.title,
                distilled_markdown=excluded.distilled_markdown,
                key_learnings_json=excluded.key_learnings_json,
                tags=excluded.tags
        """, (eid, session_id, title, distilled_markdown, key_learnings_json, tags, created_at))
        conn.commit()
        cursor.close()
        conn.close()
        conn = None

        # Write markdown file
        clean_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in title.lower())[:40].strip("_")
        fname = f"sess_{clean_title}_{eid[:8]}.md"
        fpath = os.path.join(PM_EXPERIENCE_LEDGER_DIR, fname)
        os.makedirs(PM_EXPERIENCE_LEDGER_DIR, exist_ok=True)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(f"# 🧠 Experience Ledger: {title}\n*Created: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M WIB')} | Session: {session_id}*\n\n{distilled_markdown}\n")

        return {"status": "ok", "id": eid, "title": title, "file": fname}
    except Exception as e:
        log(f"Error in db_save_experience_distillation: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_save_anti_pattern(ap):
    conn = None
    try:
        if not isinstance(ap, dict):
            return {"status": "error", "error": "Invalid anti-pattern item"}
        
        now = int(time.time() * 1000)
        apid = str(ap.get("id") or f"ap_{now}_{uuid.uuid4().hex[:6]}")
        target_domain = str(ap.get("target_domain") or "General").strip()
        mistake_description = str(ap.get("mistake_description") or "").strip()
        root_cause = str(ap.get("root_cause") or "").strip()
        winning_fix = str(ap.get("winning_fix") or "").strip()
        prevention_rule = str(ap.get("prevention_rule") or "").strip()
        created_at = int(ap.get("created_at") or now)

        if not mistake_description or not winning_fix:
            return {"status": "error", "error": "Mistake description and winning fix are required"}

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO anti_patterns (id, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                target_domain=excluded.target_domain,
                mistake_description=excluded.mistake_description,
                root_cause=excluded.root_cause,
                winning_fix=excluded.winning_fix,
                prevention_rule=excluded.prevention_rule
        """, (apid, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at))
        conn.commit()
        cursor.close()
        conn.close()
        conn = None

        # Dual-sync to failure_learnings.md
        sync_failure_learnings_markdown()

        return {"status": "ok", "id": apid, "target_domain": target_domain}
    except Exception as e:
        log(f"Error in db_save_anti_pattern: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_save_autonomous_skill(sk):
    conn = None
    try:
        if not isinstance(sk, dict):
            return {"status": "error", "error": "Invalid skill item"}
        
        now = int(time.time() * 1000)
        skid = str(sk.get("id") or f"skill_auto_{now}_{uuid.uuid4().hex[:6]}")
        name = str(sk.get("name") or "Autonomous Skill").strip()
        description = str(sk.get("description") or "").strip()
        workflow_markdown = str(sk.get("workflow_markdown") or "").strip()
        version = str(sk.get("version") or "v1.0.0")
        source = str(sk.get("source") or "autonomous_ai")
        success_count = int(sk.get("success_count") or 1)
        failure_count = int(sk.get("failure_count") or 0)
        changelog = str(sk.get("changelog") or "")
        created_at = int(sk.get("created_at") or now)
        updated_at = now

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO autonomous_skills (id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                description=excluded.description,
                workflow_markdown=excluded.workflow_markdown,
                version=excluded.version,
                source=excluded.source,
                success_count=excluded.success_count,
                failure_count=excluded.failure_count,
                changelog=excluded.changelog,
                updated_at=excluded.updated_at
        """, (skid, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at))
        conn.commit()
        cursor.close()
        conn.close()
        conn = None

        # Write formatted markdown file
        fname = f"{skid}.md"
        fpath = os.path.join(PM_AUTONOMOUS_SKILLS_DIR, fname)
        os.makedirs(PM_AUTONOMOUS_SKILLS_DIR, exist_ok=True)
        md_content = f"""---
id: {skid}
name: "{name}"
type: autonomous_skill
version: "{version}"
description: "{description}"
source: "{source}"
success_count: {success_count}
failure_count: {failure_count}
changelog: "{changelog}"
created_at: {created_at}
updated_at: {updated_at}
---

# ⚡ {name} ({version})

## 🎯 Deskripsi & Trigger:
{description}

## 📋 Prosedur Langkah demi Langkah (SOP / Workflow):
{workflow_markdown}
"""
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(md_content)

        return {"status": "ok", "id": skid, "name": name, "version": version}
    except Exception as e:
        log(f"Error in db_save_autonomous_skill: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_save_autonomous_agent(ag):
    conn = None
    try:
        if not isinstance(ag, dict):
            return {"status": "error", "error": "Invalid agent item"}
        
        now = int(time.time() * 1000)
        agid = str(ag.get("id") or f"agent_auto_{now}_{uuid.uuid4().hex[:6]}")
        name = str(ag.get("name") or "Autonomous Agent").strip()
        role_description = str(ag.get("role_description") or "").strip()
        system_prompt = str(ag.get("system_prompt") or "").strip()
        raw_skills = ag.get("assigned_skills") or []
        
        if isinstance(raw_skills, str):
            try: assigned_skills = json.loads(raw_skills)
            except Exception: assigned_skills = [raw_skills] if raw_skills.strip() else []
        elif isinstance(raw_skills, list):
            assigned_skills = raw_skills
        else:
            assigned_skills = []

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Intelligent Auto-Routing & Dedicated Skill Synthesis: Never leave an agent with empty skills
        if not assigned_skills:
            cursor.execute("SELECT id, name, description FROM autonomous_skills")
            all_skills = [dict(r) for r in cursor.fetchall()]
            for sk in all_skills:
                sk_name = (sk.get("name") or "").lower()
                sk_desc = (sk.get("description") or "").lower()
                agent_text = (name + " " + role_description).lower()
                tokens = [t for t in sk_name.split() if len(t) > 3]
                if any(tok in agent_text for tok in tokens) or (sk.get("id") in agent_text):
                    if sk["id"] not in assigned_skills:
                        assigned_skills.append(sk["id"])
            
            # If still empty, synthesize dedicated custom skills for this specialist agent
            if not assigned_skills:
                safe_prefix = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower().replace(" ", "_"))
                synth_skill_id = f"skill_auto_{safe_prefix}_{uuid.uuid4().hex[:4]}"
                synth_skill_name = f"SOP & Alur Kerja: {name}"
                synth_skill_desc = f"Standar operasional prosedur terstruktur dan alur eksekusi presisi untuk sub-agent {name}."
                synth_skill_workflow = f"""### 1. 🎯 Identifikasi Kebutuhan & Intent:
- Analisis permintaan pengguna secara spesifik sesuai peran {name}.
- Lakukan validasi parameter input sebelum menjalankan tool apa pun.

### 2. ⚡ Prosedur Eksekusi Terukur:
- Jalankan strategi optimal berdasarkan persona: {role_description}.
- Jika terjadi hambatan/error, lakukan diagnosa mandiri dan catat solusi permanen ke anti-patterns.

### 3. 🛡️ Verifikasi Output & Zero Error:
- Sajikan hasil akhir dengan akurasi 100%, ringkas, to the point, dan bebas dari halusinasi."""
                
                cursor.execute("""
                    INSERT INTO autonomous_skills (id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'Auto-synthesized for specialist agent', ?, ?)
                    ON CONFLICT(id) DO NOTHING
                """, (synth_skill_id, synth_skill_name, synth_skill_desc, synth_skill_workflow, 'v1.0.0', 'autonomous_ai', now, now))
                
                # Write skill markdown to disk
                sk_fname = f"{synth_skill_id}.md"
                sk_fpath = os.path.join(PM_AUTONOMOUS_SKILLS_DIR, sk_fname)
                os.makedirs(PM_AUTONOMOUS_SKILLS_DIR, exist_ok=True)
                with open(sk_fpath, "w", encoding="utf-8") as sk_f:
                    sk_f.write(f"""---
id: {synth_skill_id}
name: "{synth_skill_name}"
type: autonomous_skill
version: "v1.0.0"
description: "{synth_skill_desc}"
source: "autonomous_ai"
success_count: 1
failure_count: 0
created_at: {now}
updated_at: {now}
---

# ⚡ {synth_skill_name} (v1.0.0)

## 🎯 Deskripsi & Trigger:
{synth_skill_desc}

## 📋 Prosedur Langkah demi Langkah (SOP / Workflow):
{synth_skill_workflow}
""")
                assigned_skills.append(synth_skill_id)

        assigned_skills_json = json.dumps(assigned_skills)
        source = str(ag.get("source") or "autonomous_ai")
        reason = str(ag.get("reason") or "")
        created_at = int(ag.get("created_at") or now)
        updated_at = now

        cursor.execute("""
            INSERT INTO autonomous_agents (id, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                role_description=excluded.role_description,
                system_prompt=excluded.system_prompt,
                assigned_skills_json=excluded.assigned_skills_json,
                source=excluded.source,
                reason=excluded.reason,
                updated_at=excluded.updated_at
        """, (agid, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at))
        conn.commit()

        # Fetch connected skills detail for rich markdown rendering
        skills_details = []
        if assigned_skills:
            placeholders = ",".join(["?"] * len(assigned_skills))
            cursor.execute(f"SELECT id, name, description FROM autonomous_skills WHERE id IN ({placeholders})", assigned_skills)
            skills_details = [dict(r) for r in cursor.fetchall()]

        cursor.close()
        conn.close()
        conn = None

        if skills_details:
            skills_bullet_points = "\n".join([f"- **`{s['id']}`** ({s.get('name', '')}): {s.get('description', '')}" for s in skills_details])
        else:
            skills_bullet_points = "- Tidak ada skill terhubung langsung (General Agent)."

        # Write formatted markdown file
        fname = f"{agid}.md"
        fpath = os.path.join(PM_AUTONOMOUS_AGENTS_DIR, fname)
        os.makedirs(PM_AUTONOMOUS_AGENTS_DIR, exist_ok=True)
        md_content = f"""---
id: {agid}
name: "{name}"
type: specialist_agent
description: "{role_description}"
source: "{source}"
reason: "{reason}"
assigned_skills: {assigned_skills_json}
created_at: {created_at}
updated_at: {updated_at}
---

# 🤖 {name} (Specialist Autonomous Agent)

## 🎭 Persona & Role Target:
{role_description}

## 🔗 Connected Skills (Autonomous Routing):
{skills_bullet_points}

## 📜 System Prompt & Instruksi Operasional:
{system_prompt}
"""
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(md_content)

        return {"status": "ok", "id": agid, "name": name, "assigned_skills": assigned_skills}
    except Exception as e:
        log(f"Error in db_save_autonomous_agent: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def distill_session_to_training_md(session_dict):
    """
    Distills raw session messages into token-efficient point-by-point training markdown.
    Strips noise, conversational bloat, raw html dumps, while preserving high-signal intent,
    tool workflows, commands, and empirical conclusions.
    """
    try:
        sid = str(session_dict.get("id") or "")
        title = str(session_dict.get("title") or "Session Training").strip()
        model = str(session_dict.get("model") or "Default Model")
        created_at = int(session_dict.get("created_at") or int(time.time() * 1000))
        date_str = datetime.datetime.fromtimestamp(created_at / 1000.0).strftime('%Y-%m-%d %H:%M:%S')

        raw_messages = []
        msg_json = session_dict.get("messages_json")
        if isinstance(msg_json, str):
            try: raw_messages = json.loads(msg_json)
            except Exception: raw_messages = []
        elif isinstance(session_dict.get("messages"), list):
            raw_messages = session_dict.get("messages")

        if not raw_messages:
            return None

        # 1. Extract intents, tools, and conclusions
        user_intents = []
        tool_workflows = []
        assistant_conclusions = []

        for m in raw_messages:
            role = m.get("role")
            content = m.get("content") or ""
            
            if role == "user":
                clean_u = content.strip()
                if clean_u and len(clean_u) > 2:
                    clean_u = clean_u.split("[IMAGE_DATA:")[0].split("<SYSTEM_MESSAGE>")[0].strip()
                    if clean_u and clean_u not in user_intents:
                        user_intents.append(clean_u)
            
            elif role == "assistant":
                tool_calls = m.get("tool_calls") or []
                if tool_calls:
                    for tc in tool_calls:
                        fn = tc.get("function") or {}
                        fname = fn.get("name") or "unknown_tool"
                        fargs_raw = fn.get("arguments") or "{}"
                        try:
                            fargs = json.loads(fargs_raw) if isinstance(fargs_raw, str) else fargs_raw
                        except Exception:
                            fargs = {}
                        
                        if fname == "local_run_command":
                            cmd_str = str(fargs.get('command') or '')[:100]
                            tool_workflows.append(f"`local_run_command({cmd_str})`")
                        elif fname.startswith("browser_"):
                            t_arg = str(fargs.get('url') or fargs.get('backendNodeId') or '')[:80]
                            tool_workflows.append(f"`{fname}({t_arg})`")
                        elif fname.startswith("db_") or fname.startswith("create_") or fname.startswith("manage_"):
                            t_arg = str(fargs.get('name') or fargs.get('category') or fargs.get('title') or '')[:80]
                            tool_workflows.append(f"`{fname}({t_arg})`")
                        else:
                            tool_workflows.append(f"`{fname}()`")

                if content and isinstance(content, str):
                    clean_a = content.strip()
                    if len(clean_a) > 20 and not clean_a.startswith("Task task-") and not clean_a.startswith("Error:"):
                        lines = [l.strip() for l in clean_a.split("\n") if l.strip() and not l.startswith("```") and not l.startswith("<")]
                        if lines:
                            first_p = lines[0][:160]
                            if first_p and first_p not in assistant_conclusions:
                                assistant_conclusions.append(first_p)

        intents_md = "\n".join([f"- {u}" for u in user_intents[:6]]) or "- Percakapan dan instruksi umum."
        workflows_md = "\n".join([f"- {tw}" for tw in tool_workflows[:10]]) or "- Eksekusi respons langsung tanpa tool eksternal."
        conclusions_md = "\n".join([f"- {c}" for c in assistant_conclusions[:4]]) or "- Solusi dan jawaban tuntas disajikan."

        raw_size = len(json.dumps(raw_messages))
        distilled_md = f"""# 🎯 Training Point: {title}
- **Session ID**: `{sid}`
- **Model Target**: `{model}`
- **Waktu Eksekusi**: `{date_str}`

## 📌 User Core Intent & Directives:
{intents_md}

## 🛠️ Execution Strategy & Tool Workflow:
{workflows_md}

## 💡 Key Learnings & Solusi Akhir:
{conclusions_md}
"""
        distilled_size = len(distilled_md)
        tokens_saved = max(0, (raw_size - distilled_size) // 4)

        return {
            "id": f"train_{sid}",
            "session_id": sid,
            "title": title,
            "model": model,
            "distilled_points_md": distilled_md,
            "key_intents": user_intents[:6],
            "tool_workflows": tool_workflows[:10],
            "learnings": assistant_conclusions[:4],
            "token_saved_estimate": tokens_saved,
            "created_at": created_at,
            "updated_at": int(time.time() * 1000)
        }
    except Exception as e:
        log(f"Error in distill_session_to_training_md: {e}")
        return None

def db_auto_distill_all_sessions():
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
        sessions = [dict(r) for r in cursor.fetchall()]
        
        os.makedirs(PM_TRAINING_CORPUS_DIR, exist_ok=True)
        
        distilled_count = 0
        total_tokens_saved = 0
        now = int(time.time() * 1000)

        for s in sessions:
            item = distill_session_to_training_md(s)
            if item:
                cursor.execute("""
                    INSERT INTO chat_training_corpus (id, session_id, title, model, distilled_points_md, key_intents_json, tool_workflows_json, learnings_json, token_saved_estimate, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        title=excluded.title,
                        model=excluded.model,
                        distilled_points_md=excluded.distilled_points_md,
                        key_intents_json=excluded.key_intents_json,
                        tool_workflows_json=excluded.tool_workflows_json,
                        learnings_json=excluded.learnings_json,
                        token_saved_estimate=excluded.token_saved_estimate,
                        updated_at=excluded.updated_at
                """, (
                    item["id"], item["session_id"], item["title"], item["model"],
                    item["distilled_points_md"], json.dumps(item["key_intents"]),
                    json.dumps(item["tool_workflows"]), json.dumps(item["learnings"]),
                    item["token_saved_estimate"], item["created_at"], now
                ))

                safe_sid = re.sub(r'[^a-zA-Z0-9_-]', '_', item["session_id"])
                fpath = os.path.join(PM_TRAINING_CORPUS_DIR, f"{safe_sid}.md")
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(item["distilled_points_md"])

                distilled_count += 1
                total_tokens_saved += item["token_saved_estimate"]

        conn.commit()
        cursor.close()
        return {
            "status": "ok",
            "distilled_count": distilled_count,
            "total_tokens_saved": total_tokens_saved
        }
    except Exception as e:
        log(f"Error in db_auto_distill_all_sessions: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_delete_persistent_item(item_type, item_id):
    conn = None
    try:
        table_map = {
            "memory": ("user_memories", "id"),
            "experience": ("experience_ledger", "id"),
            "anti_pattern": ("anti_patterns", "id"),
            "skill": ("autonomous_skills", "id"),
            "agent": ("autonomous_agents", "id"),
            "training": ("chat_training_corpus", "id")
        }
        if item_type not in table_map:
            return {"status": "error", "error": f"Unknown item type: {item_type}"}

        table_name, id_col = table_map[item_type]
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM {table_name} WHERE {id_col} = ?", (str(item_id),))
        conn.commit()
        cursor.close()
        conn.close()
        conn = None

        if item_type == "memory":
            sync_personal_facts_markdown()
        elif item_type == "anti_pattern":
            sync_failure_learnings_markdown()
        elif item_type == "skill":
            fpath = os.path.join(PM_AUTONOMOUS_SKILLS_DIR, f"{item_id}.md")
            if os.path.exists(fpath):
                try: os.remove(fpath)
                except Exception: pass
        elif item_type == "agent":
            fpath = os.path.join(PM_AUTONOMOUS_AGENTS_DIR, f"{item_id}.md")
            if os.path.exists(fpath):
                try: os.remove(fpath)
                except Exception: pass
        elif item_type == "training":
            safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(item_id).replace("train_", ""))
            fpath = os.path.join(PM_TRAINING_CORPUS_DIR, f"{safe_id}.md")
            if os.path.exists(fpath):
                try: os.remove(fpath)
                except Exception: pass

        return {"status": "ok", "deleted_id": item_id, "type": item_type}
    except Exception as e:
        log(f"Error in db_delete_persistent_item: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

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

    # Persistent Memory RPC Actions
    elif action == "db_get_persistent_memory":
        res = db_get_persistent_memory(msg.get("search", ""))
        res["id"] = req_id
        return res

    elif action == "db_auto_distill_all_sessions":
        res = db_auto_distill_all_sessions()
        res["id"] = req_id
        return res

    elif action == "db_save_personal_memory":
        res = db_save_personal_memory(msg.get("memory", {}))
        res["id"] = req_id
        return res

    elif action == "db_save_experience_distillation":
        res = db_save_experience_distillation(msg.get("distillation", {}))
        res["id"] = req_id
        return res

    elif action == "db_save_anti_pattern":
        res = db_save_anti_pattern(msg.get("anti_pattern", {}))
        res["id"] = req_id
        return res

    elif action == "db_save_autonomous_skill":
        res = db_save_autonomous_skill(msg.get("skill", {}))
        res["id"] = req_id
        return res

    elif action == "db_save_autonomous_agent":
        res = db_save_autonomous_agent(msg.get("agent", {}))
        res["id"] = req_id
        return res

    elif action == "db_delete_persistent_item":
        res = db_delete_persistent_item(msg.get("item_type", ""), msg.get("item_id", ""))
        res["id"] = req_id
        return res

    elif action == "db_sync_persistent_memory_files":
        sync_persistent_memory_on_startup()
        sync_personal_facts_markdown()
        sync_failure_learnings_markdown()
        res = {"status": "ok", "synced": True}
        res["id"] = req_id
        return res

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

    elif action == "db_export_full_database":
        res = db_export_full_database()
        res["id"] = req_id
        return res

    elif action == "db_import_full_database":
        res = db_import_full_database(msg.get("payload", {}))
        res["id"] = req_id
        return res

    elif action == "db_export_targz_backup":
        res = db_export_targz_backup(msg.get("storage", {}))
        res["id"] = req_id
        return res

    elif action == "db_import_targz_backup":
        res = db_import_targz_backup(msg.get("tar_gz_b64", ""))
        res["id"] = req_id
        return res

    elif action == "db_import_targz_from_path":
        res = db_import_targz_from_path(msg.get("file_path", ""))
        res["id"] = req_id
        return res

    elif action == "db_import_chunk_start":
        res = db_import_chunk_start(msg.get("filename"), msg.get("total_chunks"), msg.get("total_bytes"))
        res["id"] = req_id
        return res

    elif action == "db_import_chunk_data":
        res = db_import_chunk_data(msg.get("chunk_index"), msg.get("chunk_b64"))
        res["id"] = req_id
        return res

    elif action == "db_import_chunk_finish":
        res = db_import_chunk_finish()
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
