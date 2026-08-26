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
PM_HISTORY_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, ".history")
PM_KNOWLEDGE_GRAPH_DIR = os.path.join(PERSISTENT_MEMORY_ROOT, "knowledge_graph")

import base64
import urllib.request
import datetime
import math

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
        os.makedirs(PM_HISTORY_DIR, exist_ok=True)
        os.makedirs(PM_KNOWLEDGE_GRAPH_DIR, exist_ok=True)

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
                    is_pinned INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            try:
                cursor.execute("ALTER TABLE sessions ADD COLUMN is_pinned INTEGER DEFAULT 0")
            except Exception:
                pass
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_pinned_updated ON sessions(is_pinned DESC, updated_at DESC)")

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

            # 7. Persistent Item Edit History & Rollback Snapshots
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS persistent_item_history (
                    id TEXT PRIMARY KEY,
                    item_type TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    item_name TEXT DEFAULT '',
                    previous_meta_json TEXT NOT NULL,
                    previous_content TEXT NOT NULL,
                    backup_file_path TEXT,
                    edited_by TEXT DEFAULT 'autonomous_ai',
                    change_summary TEXT DEFAULT '',
                    created_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_item ON persistent_item_history(item_type, item_id, created_at DESC)")

            # 8. Epistemic Knowledge Hypergraph Triplets (Mathematical Decay & Conflict Resolution)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS graph_epistemic_triplets (
                    id TEXT PRIMARY KEY,
                    subject TEXT NOT NULL,
                    predicate TEXT NOT NULL,
                    object TEXT NOT NULL,
                    confidence REAL DEFAULT 1.0,
                    decay_tau REAL DEFAULT 2592000.0,
                    source_kappa TEXT DEFAULT 'user_chat',
                    negative_constraint INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'active',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_epistemic_sub_pred ON graph_epistemic_triplets(subject, predicate)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_epistemic_status_neg ON graph_epistemic_triplets(status, negative_constraint)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_epistemic_updated ON graph_epistemic_triplets(updated_at DESC)")

            conn.commit()
            cursor.close()
        finally:
            conn.close()
        
        log(f"SQLite database initialized at {DB_PATH}, persistent memory, epistemic graph & rollback history tables ready")
    except Exception as e:
        log(f"Failed to initialize SQLite database: {e}\n{traceback.format_exc()}")

# Will be initialized after persistent memory functions are defined

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

def backup_item_before_mutation(item_type, item_id, item_name, current_meta, current_content, edited_by="autonomous_ai", change_summary=""):
    """
    Creates a snapshot backup in PERSISTENT MEMORY/.history/ and SQLite before an item is edited/improved.
    """
    try:
        now = int(time.time() * 1000)
        hist_id = f"hist_{item_type}_{item_id}_{now}"
        hist_dir = os.path.join(PM_HISTORY_DIR, item_type)
        os.makedirs(hist_dir, exist_ok=True)
        
        safe_id = re.sub(r'[^a-zA-Z0-9_]', '_', str(item_id))
        backup_fname = f"{safe_id}_{now}.bak.md"
        backup_fpath = os.path.join(hist_dir, backup_fname)
        
        # Write markdown snapshot
        with open(backup_fpath, "w", encoding="utf-8") as f:
            f.write(f"""---
history_id: {hist_id}
item_type: {item_type}
item_id: {item_id}
item_name: "{item_name}"
edited_by: "{edited_by}"
change_summary: "{change_summary}"
timestamp: {now}
meta_json: {json.dumps(current_meta)}
---

# 🕒 Backup Snapshot: {item_name} ({item_id})
*Backed up at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB')} | Editor: {edited_by}*

{current_content}
""")
        
        # Insert into SQLite
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO persistent_item_history (id, item_type, item_id, item_name, previous_meta_json, previous_content, backup_file_path, edited_by, change_summary, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (hist_id, item_type, str(item_id), str(item_name), json.dumps(current_meta), str(current_content), backup_fpath, edited_by, change_summary, now))
            conn.commit()
            cursor.close()
        finally:
            conn.close()
        log(f"Snapshot backup created for {item_type} {item_id} at {backup_fpath}")
        return hist_id
    except Exception as e:
        log(f"Warning: Failed to create snapshot backup for {item_type} {item_id}: {e}")
        return None

def db_list_item_history(item_type, item_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, item_type, item_id, item_name, previous_meta_json, previous_content, backup_file_path, edited_by, change_summary, created_at
            FROM persistent_item_history
            WHERE item_type = ? AND item_id = ?
            ORDER BY created_at DESC
        """, (item_type, str(item_id)))
        rows = [dict(r) for r in cursor.fetchall()]
        cursor.close()
        conn.close()
        return {"status": "ok", "history": rows}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def db_rollback_item(item_type, item_id, history_id=None):
    """
    Restores the specified item to its previous version from history.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if history_id:
            cursor.execute("SELECT * FROM persistent_item_history WHERE id = ?", (history_id,))
        else:
            cursor.execute("SELECT * FROM persistent_item_history WHERE item_type = ? AND item_id = ? ORDER BY created_at DESC LIMIT 1", (item_type, str(item_id)))
        
        hist = cursor.fetchone()
        if not hist:
            cursor.close()
            conn.close()
            return {"status": "error", "error": "No backup history found for rollback"}
        
        hist_dict = dict(hist)
        prev_meta = json.loads(hist_dict["previous_meta_json"] or "{}")
        prev_content = hist_dict["previous_content"]
        cursor.close()
        conn.close()
        
        # Apply restore based on item_type
        if item_type in ("skill", "agent", "memory"):
            target_dir = SKILLS_DIR if item_type == "skill" else (AGENTS_DIR if item_type == "agent" else MEMORIES_DIR)
            save_md_item(target_dir, {**prev_meta, "content": prev_content})
        elif item_type == "autonomous_skill":
            db_save_autonomous_skill({
                "id": str(item_id),
                "name": prev_meta.get("name") or hist_dict.get("item_name"),
                "description": prev_meta.get("description") or "",
                "workflow_markdown": prev_content,
                "version": prev_meta.get("version") or "v1.0.0",
                "source": "rollback_restore"
            })
        elif item_type == "autonomous_agent":
            db_save_autonomous_agent({
                "id": str(item_id),
                "name": prev_meta.get("name") or hist_dict.get("item_name"),
                "role_description": prev_meta.get("role_description") or "",
                "system_prompt": prev_content,
                "assigned_skills": prev_meta.get("assigned_skills") or [],
                "source": "rollback_restore"
            })
        elif item_type == "user_memory":
            db_save_personal_memory({
                "id": str(item_id),
                "category": prev_meta.get("category") or "rule",
                "content": prev_content,
                "source": "rollback_restore",
                "reason": "Restored from history backup"
            })
            
        log(f"Rollback successful for {item_type} {item_id} using history {hist_dict['id']}")
        return {"status": "ok", "message": f"Successfully rolled back {item_type} {item_id} to previous version", "restored_meta": prev_meta}
    except Exception as e:
        log(f"Error in db_rollback_item: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

def save_md_item(target_dir, item_data):
    try:
        item_id = item_data.get("id")
        if not item_id:
            name_slug = (item_data.get("name") or "item").lower().replace(" ", "_")
            item_id = f"{name_slug}_{int(time.time())}"
        
        file_path = os.path.join(target_dir, f"{item_id}.md")
        content = item_data.get("content") or item_data.get("system_prompt") or item_data.get("instructions") or ""
        
        # Pre-edit snapshot backup if file already exists and content has changed
        if os.path.exists(file_path):
            existing = parse_md_file(file_path)
            if existing:
                existing_content = (existing.get("content") or "").strip()
                new_content = content.strip()
                if existing_content != new_content:
                    existing_meta = existing.get("meta", {})
                    item_type = "skill" if target_dir == SKILLS_DIR else ("agent" if target_dir == AGENTS_DIR else "memory")
                    backup_item_before_mutation(
                        item_type=item_type,
                        item_id=item_id,
                        item_name=existing_meta.get("name") or item_id,
                        current_meta=existing_meta,
                        current_content=existing.get("content") or "",
                        edited_by=item_data.get("edited_by", "user" if "user" in str(item_data.get("source", "")) else "autonomous_ai"),
                        change_summary=item_data.get("change_summary", "Updated configuration")
                    )

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
        if "source" in item_data:
            meta["source"] = item_data.get("source")
        if "created_by" in item_data:
            meta["created_by"] = item_data.get("created_by")
        if "edited_by" in item_data:
            meta["edited_by"] = item_data.get("edited_by")
        if "last_refined" in item_data:
            meta["last_refined"] = item_data.get("last_refined")
        if "changelog" in item_data:
            meta["changelog"] = item_data.get("changelog")
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

def transcribe_audio_file(file_base64, mime_type="audio/ogg", api_key="", endpoint="", preset=""):
    try:
        if not file_base64:
            return {"status": "error", "error": "No audio data provided"}

        tmp_id = f"voice_{int(time.time() * 1000)}"
        in_path = f"/tmp/{tmp_id}.ogg"
        out_mp3_path = f"/tmp/{tmp_id}.mp3"

        raw_bytes = base64.b64decode(file_base64)
        with open(in_path, "wb") as f:
            f.write(raw_bytes)

        # Convert to MP3 using ffmpeg for maximum STT compatibility
        has_mp3 = False
        try:
            conv = subprocess.run(["ffmpeg", "-i", in_path, "-vn", "-ar", "44100", "-ac", "1", "-b:a", "128k", out_mp3_path, "-y"], capture_output=True, timeout=10)
            if conv.returncode == 0 and os.path.exists(out_mp3_path):
                has_mp3 = True
        except Exception as fe:
            log(f"ffmpeg conversion notice: {fe}")

        upload_path = out_mp3_path if has_mp3 else in_path
        transcribed_text = ""

        # Strategy 1: Google Gemini Multimodal Audio Transcription
        if api_key and (api_key.startswith("AIza") or "generativelanguage" in endpoint or preset == "gemini" or preset == "9router"):
            try:
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
                with open(upload_path, "rb") as f_up:
                    audio_b64 = base64.b64encode(f_up.read()).decode("utf-8")
                
                req_body = {
                    "contents": [{
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": "audio/mp3" if has_mp3 else "audio/ogg",
                                    "data": audio_b64
                                }
                            },
                            {
                                "text": "Transkripsikan seluruh isi rekaman suara ini secara akurat dan tepat kata per kata ke dalam teks bahasa Indonesia/Inggris. HANYA berikan hasil transkripnya saja tanpa kata pembuka, penutup, atau tanda kutip."
                            }
                        ]
                    }]
                }
                gem_req = urllib.request.Request(
                    gemini_url,
                    data=json.dumps(req_body).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(gem_req, timeout=30) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    text_parts = resp_data.get("candidates", [])[0].get("content", {}).get("parts", [])
                    transcribed_text = "".join(p.get("text", "") for p in text_parts).strip()
            except Exception as ge:
                log(f"Gemini audio transcription notice: {ge}")

        # Strategy 2: OpenAI / Groq / OpenRouter / Custom Whisper Endpoint
        if not transcribed_text and api_key:
            stt_endpoint = ""
            stt_model = "whisper-1"
            if preset == "groq" or "api.groq.com" in endpoint:
                stt_endpoint = "https://api.groq.com/openai/v1/audio/transcriptions"
                stt_model = "whisper-large-v3-turbo"
            elif "api.openai.com" in endpoint or preset == "openai":
                stt_endpoint = "https://api.openai.com/v1/audio/transcriptions"
                stt_model = "whisper-1"
            elif endpoint:
                base = endpoint.rstrip("/").replace("/chat/completions", "")
                stt_endpoint = f"{base}/audio/transcriptions"
                stt_model = "whisper-1"

            if stt_endpoint:
                try:
                    curl_cmd = [
                        "curl", "-s", "-X", "POST", stt_endpoint,
                        "-H", f"Authorization: Bearer {api_key}",
                        "-F", f"file=@{upload_path}",
                        "-F", f"model={stt_model}"
                    ]
                    curl_res = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=30)
                    if curl_res.returncode == 0 and curl_res.stdout:
                        res_json = json.loads(curl_res.stdout)
                        if "text" in res_json:
                            transcribed_text = res_json["text"].strip()
                except Exception as oe:
                    log(f"OpenAI/Whisper transcription notice: {oe}")

        # Cleanup temp files
        for p in [in_path, out_mp3_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

        if transcribed_text:
            return {"status": "ok", "text": transcribed_text}
        else:
            return {"status": "error", "error": "Gagal mentranskripsikan suara dengan API yang terkonfigurasi."}
    except Exception as e:
        log(f"Error in transcribe_audio_file: {e}")
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
        is_pinned = 1 if session_data.get("is_pinned") else 0

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (id, title, model, message_count, preview, messages_json, is_pinned, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    model=excluded.model,
                    message_count=excluded.message_count,
                    preview=excluded.preview,
                    messages_json=excluded.messages_json,
                    is_pinned=COALESCE(excluded.is_pinned, sessions.is_pinned, 0),
                    updated_at=excluded.updated_at
            """, (sid, title, model, int(msg_count), str(preview), str(messages_json), int(is_pinned), int(created_at), int(updated_at)))
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

            # Real-time Autonomous Self-Learning & Fact Extraction
            try:
                auto_extract_facts_and_learnings_from_session({
                    "id": sid,
                    "title": title,
                    "model": model,
                    "messages_json": messages_json,
                    "created_at": created_at,
                    "updated_at": updated_at
                })
            except Exception as e_fact:
                log(f"Auto-extract facts in db_save_session ignored error: {e_fact}")

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
                    SELECT id, title, model, message_count, preview, COALESCE(is_pinned, 0) as is_pinned, created_at, updated_at
                    FROM sessions
                    WHERE title LIKE ? OR preview LIKE ? OR model LIKE ?
                    ORDER BY is_pinned DESC, updated_at DESC
                """, (query, query, query))
            else:
                cursor.execute("""
                    SELECT id, title, model, message_count, preview, COALESCE(is_pinned, 0) as is_pinned, created_at, updated_at
                    FROM sessions
                    ORDER BY is_pinned DESC, updated_at DESC
                """)
            rows = cursor.fetchall()
            sessions = [dict(row) for row in rows]
            return {"status": "ok", "sessions": sessions}
    except Exception as e:
        log(f"Error in db_get_sessions: {e}")
        return {"status": "error", "error": str(e)}

def db_pin_session(sid, is_pinned=True):
    try:
        pinned_val = 1 if is_pinned else 0
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE sessions SET is_pinned = ? WHERE id = ?", (pinned_val, sid))
            conn.commit()
        return {"status": "ok", "id": sid, "is_pinned": bool(pinned_val)}
    except Exception as e:
        log(f"Error in db_pin_session: {e}")
        return {"status": "error", "error": str(e)}

def db_rename_session(sid, new_title):
    try:
        new_title = str(new_title or "").strip()
        if not new_title:
            return {"status": "error", "error": "Title cannot be empty"}
        now = int(time.time() * 1000)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", (new_title, now, sid))
            cursor.execute("UPDATE chat_training_corpus SET title = ?, updated_at = ? WHERE session_id = ?", (new_title, now, sid))
            conn.commit()
        return {"status": "ok", "id": sid, "title": new_title, "updated_at": now}
    except Exception as e:
        log(f"Error in db_rename_session: {e}")
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

def auto_extract_facts_and_learnings_from_session(session_dict):
    """
    Continuous Autonomous Self-Learning Reflex:
    Silently extracts personal facts, email addresses, usernames, credentials, rules, preferences,
    and anti-patterns from the conversation, and commits them to SQLite and persistent markdown files.
    """
    try:
        messages_raw = session_dict.get("messages_json") or session_dict.get("messages") or []
        if isinstance(messages_raw, str):
            try: messages_raw = json.loads(messages_raw)
            except Exception: messages_raw = []
        if not messages_raw or not isinstance(messages_raw, list):
            return

        sid = session_dict.get("id") or f"sess_{int(time.time()*1000)}"
        now = int(time.time() * 1000)

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            
            # Fetch existing memories to avoid duplicates
            cursor.execute("SELECT LOWER(content) FROM user_memories")
            existing_contents = [r[0] for r in cursor.fetchall()]

            for idx, msg in enumerate(messages_raw):
                role = msg.get("role")
                content = msg.get("content") or ""
                if not isinstance(content, str):
                    continue

                if role == "user":
                    clean_u = content.strip().split("[IMAGE_DATA:")[0].split("<SYSTEM_MESSAGE>")[0].strip()
                    if not clean_u or len(clean_u) < 3:
                        continue

                    # 1. Detect Email Mentions (e.g. "buka email saya pribadi aryansyah1509", "email saya xxx@gmail.com", "itu email saya bro")
                    found_emails = list(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', clean_u))
                    
                    # Also check for username mentioned with email intent (e.g. "email saya pribadi aryansyah1509" or "buka email saya aryansyah1509")
                    email_match = re.search(r'(?:email|mail)\s+(?:saya\s+)?(?:pribadi\s+)?([a-zA-Z0-9_.-]{4,30})', clean_u, re.I)
                    if email_match:
                        raw_val = email_match.group(1).strip()
                        if "@" not in raw_val and not raw_val.lower().startswith("pribadi") and not raw_val.lower().startswith("bro") and not raw_val.lower().startswith("aja"):
                            found_emails.append(f"{raw_val}@gmail.com")

                    for em in set(found_emails):
                        em_clean = em.strip().rstrip('.')
                        fact_text = f"Email pribadi pengguna: {em_clean}"
                        if not any(em_clean.lower() in ec for ec in existing_contents):
                            mid = f"mem_email_{re.sub(r'[^a-zA-Z0-9]', '_', em_clean.lower())[:30]}"
                            cursor.execute("""
                                INSERT INTO user_memories (id, category, content, source, reason, confidence, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at
                            """, (mid, "profile", fact_text, "autonomous_ai", "Otomatis dipelajari dari percakapan saat user menyebutkan email", 1.0, now, now))
                            existing_contents.append(fact_text.lower())
                            log(f"[Autonomous Brain] Learned new profile fact: {fact_text}")

                    # 2. Detect Name / Identity (e.g. "nama saya arya", "panggil saya bro arya")
                    name_match = re.search(r'(?:nama\s+saya|panggil\s+saya(?:\s+aja)?)\s*[:=]?\s*([A-Za-z0-9\s]{2,20})', clean_u, re.I)
                    if name_match:
                        name_val = name_match.group(1).strip()
                        if name_val.lower() not in ["bro", "kak", "admin", "ai"]:
                            fact_name = f"Nama/panggilan pengguna adalah {name_val}."
                            if not any(name_val.lower() in ec for ec in existing_contents):
                                mid = f"mem_name_{re.sub(r'[^a-zA-Z0-9]', '_', name_val.lower())[:20]}"
                                cursor.execute("""
                                    INSERT INTO user_memories (id, category, content, source, reason, confidence, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                    ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at
                                """, (mid, "profile", fact_name, "autonomous_ai", "Otomatis dipelajari saat user memperkenalkan nama", 1.0, now, now))
                                existing_contents.append(fact_name.lower())
                                log(f"[Autonomous Brain] Learned new profile fact: {fact_name}")

                    # 3. Detect Explicit Rules & Preferences (e.g. "selalu gunakan format...", "aturan permanen:...")
                    rule_match = re.search(r'(?:selalu\s+gunakan|wajib\s+selalu|aturan(?:\s+baru)?\s*:|jangan\s+pernah)\s+(.+)', clean_u, re.I)
                    if rule_match:
                        rule_val = rule_match.group(1).strip()
                        if len(rule_val) > 10:
                            fact_rule = f"Aturan pengguna: {rule_val}"
                            if not any(rule_val[:25].lower() in ec for ec in existing_contents):
                                mid = f"mem_rule_{int(time.time()*1000)}"
                                cursor.execute("""
                                    INSERT INTO user_memories (id, category, content, source, reason, confidence, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                    ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at
                                """, (mid, "rule", fact_rule, "autonomous_ai", "Otomatis dicatat dari instruksi aturan pengguna", 1.0, now, now))
                                existing_contents.append(fact_rule.lower())
                                log(f"[Autonomous Brain] Learned new user rule: {fact_rule}")

            conn.commit()

        # Re-sync personal_facts.md file on disk
        sync_personal_facts_markdown()
    except Exception as e:
        log(f"Error in auto_extract_facts_and_learnings_from_session: {e}")

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

        # Seed epistemic triplets if table empty
        cursor.execute("SELECT COUNT(*) FROM graph_epistemic_triplets")
        if cursor.fetchone()[0] == 0:
            seed_triplets = [
                ("trip_user_identity", "Arya", "is_role", "Developer & Software Architect", 1.0, "user_direct", 0),
                ("trip_tiar_dp", "Tiar Property", "offers", "DP 0% (Tanpa DP)", 1.0, "user_direct", 0),
                ("trip_tiar_kpr", "Tiar Property", "supported_by", "5 Bank Rekanan BUMN & Swasta", 1.0, "user_direct", 0),
                ("trip_tiar_blt", "BLT Marketing Commission", "is_forbidden_to_mention_to", "Konsumen Calon Pembeli", 1.0, "user_direct", 1),
                ("trip_backup_format", "Conversation Backup", "must_use_format", ".zip with full brain media", 1.0, "user_direct", 0)
            ]
            for tid, sub, pred, obj, conf, src, is_neg in seed_triplets:
                cursor.execute("""
                    INSERT INTO graph_epistemic_triplets (id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 2592000.0, ?, ?, 'active', ?, ?)
                """, (tid, sub, pred, obj, conf, src, is_neg, now, now))

        # 5. Full Autonomous Auto-Distillation in background thread so startup is instant (<10ms)
        def _background_startup_distill():
            try:
                b_conn = sqlite3.connect(DB_PATH)
                b_cursor = b_conn.cursor()
                b_cursor.execute("SELECT id, title, model, messages_json, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
                all_sess = b_cursor.fetchall()
                for s in all_sess:
                    s_id, s_title, s_model, s_msg_json, s_created, s_updated = s
                    try:
                        auto_extract_facts_and_learnings_from_session({
                            "id": s_id, "title": s_title, "model": s_model,
                            "messages_json": s_msg_json, "created_at": s_created, "updated_at": s_updated
                        })
                    except Exception:
                        pass

                    b_cursor.execute("SELECT id FROM chat_training_corpus WHERE session_id = ?", (s_id,))
                    if not b_cursor.fetchone():
                        d_item = distill_session_to_training_md({
                            "id": s_id, "title": s_title, "model": s_model,
                            "messages_json": s_msg_json, "created_at": s_created, "updated_at": s_updated
                        })
                        if d_item:
                            b_cursor.execute("""
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
                b_conn.commit()
                b_conn.close()
            except Exception as e_dist:
                log(f"Background startup auto-distill notice: {e_dist}")

        threading.Thread(target=_background_startup_distill, daemon=True).start()

        conn.commit()
    except Exception as e:
        log(f"Error in sync_persistent_memory_on_startup: {e}\n{traceback.format_exc()}")
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

# Initialize database schema and sync seeds
init_db()
sync_persistent_memory_on_startup()

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

        # 7. Epistemic Knowledge Triplets (Live Time-Decayed)
        if q:
            cursor.execute("SELECT * FROM graph_epistemic_triplets WHERE (LOWER(subject) LIKE ? OR LOWER(predicate) LIKE ? OR LOWER(object) LIKE ?) AND status = 'active' ORDER BY negative_constraint ASC, updated_at DESC", (q, q, q))
        else:
            cursor.execute("SELECT * FROM graph_epistemic_triplets WHERE status = 'active' ORDER BY negative_constraint ASC, updated_at DESC")
        epistemic_triplets = []
        for r in cursor.fetchall():
            t = dict(r)
            t["decayed_confidence"] = calculate_epistemic_decay(t["confidence"], t["updated_at"], t.get("decay_tau", 2592000.0))
            epistemic_triplets.append(t)

        cursor.close()
        return {
            "status": "ok",
            "user_memories": user_memories,
            "experience_ledger": experience_ledger,
            "anti_patterns": anti_patterns,
            "autonomous_skills": autonomous_skills,
            "autonomous_agents": autonomous_agents,
            "training_corpus": training_corpus,
            "epistemic_triplets": epistemic_triplets,
            "counts": {
                "user_memories": len(user_memories),
                "experience_ledger": len(experience_ledger),
                "anti_patterns": len(anti_patterns),
                "autonomous_skills": len(autonomous_skills),
                "autonomous_agents": len(autonomous_agents),
                "training_corpus": len(training_corpus),
                "epistemic_triplets": len(epistemic_triplets)
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
        
        # Snapshot backup before updating existing memory
        cursor.execute("SELECT category, content, reason FROM user_memories WHERE id = ?", (mid,))
        existing_mem = cursor.fetchone()
        if existing_mem:
            backup_item_before_mutation(
                item_type="user_memory",
                item_id=mid,
                item_name=mid,
                current_meta={"category": existing_mem[0], "reason": existing_mem[2]},
                current_content=existing_mem[1],
                edited_by=source,
                change_summary="Memory update"
            )

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
        
        # Snapshot backup before updating existing autonomous skill
        cursor.execute("SELECT name, description, workflow_markdown, version FROM autonomous_skills WHERE id = ?", (skid,))
        existing_sk = cursor.fetchone()
        if existing_sk:
            backup_item_before_mutation(
                item_type="autonomous_skill",
                item_id=skid,
                item_name=existing_sk[0],
                current_meta={"name": existing_sk[0], "description": existing_sk[1], "version": existing_sk[3]},
                current_content=existing_sk[2],
                edited_by=source,
                change_summary=changelog or "Autonomous skill refinement"
            )

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

        # Snapshot backup before updating existing agent
        cursor.execute("SELECT name, role_description, system_prompt, assigned_skills_json FROM autonomous_agents WHERE id = ?", (agid,))
        existing_ag = cursor.fetchone()
        if existing_ag:
            try: existing_assigned = json.loads(existing_ag[3] or "[]")
            except Exception: existing_assigned = []
            backup_item_before_mutation(
                item_type="autonomous_agent",
                item_id=agid,
                item_name=existing_ag[0],
                current_meta={"name": existing_ag[0], "role_description": existing_ag[1], "assigned_skills": existing_assigned},
                current_content=existing_ag[2],
                edited_by=str(ag.get("source") or "autonomous_ai"),
                change_summary=str(ag.get("reason") or "Autonomous agent update")
            )

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
            "training": ("chat_training_corpus", "id"),
            "epistemic": ("graph_epistemic_triplets", "id")
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
        elif item_type == "epistemic":
            sync_epistemic_graph_markdown()
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
# Epistemic Knowledge Hypergraph & Dynamic Conflict Resolution Engine
# ==========================================
def calculate_epistemic_decay(confidence, last_updated_ms, decay_tau=2592000.0):
    """
    Calculates time-decayed epistemic confidence:
    c(t) = c_0 * exp(-ln(2)/tau * delta_t_seconds)
    decay_tau: half-life in seconds (default: 30 days = 2,592,000s)
    """
    try:
        now_ms = int(time.time() * 1000)
        delta_sec = max(0.0, (now_ms - int(last_updated_ms)) / 1000.0)
        decay_tau = max(60.0, float(decay_tau or 2592000.0))
        decay_factor = math.exp(-(math.log(2.0) / decay_tau) * delta_sec)
        decayed_c = float(confidence) * decay_factor
        return max(0.01, min(1.0, round(decayed_c, 4)))
    except Exception as e:
        log(f"Error calculating epistemic decay: {e}")
        return float(confidence)

PROVENANCE_WEIGHT_MAP = {
    "bash": 1.00,
    "bash_verified": 1.00,
    "user_chat": 1.00,
    "user_direct": 1.00,
    "web": 0.95,
    "web_search": 0.95,
    "agent_inference": 0.85,
    "speculative": 0.70
}

def db_upsert_epistemic_triplet(triplet):
    """
    Upserts an epistemic knowledge triplet into graph_epistemic_triplets with dynamic conflict resolution.
    """
    conn = None
    try:
        if not isinstance(triplet, dict):
            return {"status": "error", "error": "Invalid triplet payload"}
        
        subject = str(triplet.get("subject") or "").strip()
        predicate = str(triplet.get("predicate") or "").strip()
        obj = str(triplet.get("object") or "").strip()
        
        if not subject or not predicate or not obj:
            return {"status": "error", "error": "Subject, predicate, and object are required"}
        
        now = int(time.time() * 1000)
        source_kappa = str(triplet.get("source_kappa") or triplet.get("source") or "user_chat").strip()
        prov_mult = PROVENANCE_WEIGHT_MAP.get(source_kappa, 0.90)
        raw_conf = float(triplet.get("confidence") if triplet.get("confidence") is not None else 1.0)
        confidence = round(max(0.05, min(1.0, raw_conf * prov_mult)), 4)
        decay_tau = float(triplet.get("decay_tau") or 2592000.0)
        negative_constraint = 1 if (triplet.get("negative_constraint") or triplet.get("is_negative")) else 0
        tid = str(triplet.get("id") or f"trip_{uuid.uuid4().hex[:8]}")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Dynamic Conflict Resolution: Check if active contradictory triplet exists
        cursor.execute("""
            SELECT id, object, confidence, updated_at, decay_tau, status 
            FROM graph_epistemic_triplets 
            WHERE subject = ? AND predicate = ? AND status = 'active' AND negative_constraint = ?
        """, (subject, predicate, negative_constraint))
        existing_rows = cursor.fetchall()
        
        for e_id, e_obj, e_conf, e_upd, e_tau, e_status in existing_rows:
            if e_obj.strip().lower() != obj.lower():
                # Conflict detected! Calculate decayed confidence of old fact
                decayed_old_c = calculate_epistemic_decay(e_conf, e_upd, e_tau)
                delta_c = confidence - decayed_old_c
                if delta_c > 0.15:
                    # New evidence supersedes old evidence -> Prune old edge
                    cursor.execute("UPDATE graph_epistemic_triplets SET status = 'pruned', updated_at = ? WHERE id = ?", (now, e_id))
                    log(f"Dynamic Epistemic Conflict: Pruned old triplet {e_id} ('{subject}' '{predicate}' '{e_obj}') in favor of new object '{obj}' (Delta c={delta_c:.3f})")
            else:
                # Same fact reiterated -> reinforce confidence and refresh timestamp
                tid = e_id
                confidence = min(1.0, round(max(confidence, e_conf) + 0.05, 4))
                break

        cursor.execute("""
            INSERT INTO graph_epistemic_triplets (id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                subject=excluded.subject,
                predicate=excluded.predicate,
                object=excluded.object,
                confidence=excluded.confidence,
                decay_tau=excluded.decay_tau,
                source_kappa=excluded.source_kappa,
                negative_constraint=excluded.negative_constraint,
                status='active',
                updated_at=excluded.updated_at
        """, (tid, subject, predicate, obj, confidence, decay_tau, source_kappa, negative_constraint, now, now))
        
        conn.commit()
        cursor.close()
        conn.close()
        conn = None

        # Dual-sync to markdown
        sync_epistemic_graph_markdown()

        return {
            "status": "ok",
            "id": tid,
            "subject": subject,
            "predicate": predicate,
            "object": obj,
            "confidence": confidence,
            "negative_constraint": negative_constraint
        }
    except Exception as e:
        log(f"Error in db_upsert_epistemic_triplet: {e}\n{traceback.format_exc()}")
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_get_epistemic_graph(search="", include_pruned=False):
    """
    Retrieves knowledge triplets from SQLite, calculating real-time time decay.
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = "SELECT * FROM graph_epistemic_triplets WHERE 1=1"
        params = []
        if not include_pruned:
            query += " AND status = 'active'"
        
        if search and search.strip():
            q = f"%{search.strip().lower()}%"
            query += " AND (LOWER(subject) LIKE ? OR LOWER(predicate) LIKE ? OR LOWER(object) LIKE ? OR LOWER(source_kappa) LIKE ?)"
            params.extend([q, q, q, q])
            
        query += " ORDER BY updated_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        triplets = []
        for r in rows:
            t = dict(r)
            t["decayed_confidence"] = calculate_epistemic_decay(t["confidence"], t["updated_at"], t.get("decay_tau", 2592000.0))
            triplets.append(t)
            
        return {"status": "ok", "count": len(triplets), "triplets": triplets}
    except Exception as e:
        log(f"Error in db_get_epistemic_graph: {e}")
        return {"status": "error", "error": str(e), "triplets": []}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def db_traverse_knowledge_graph(root_entity, max_depth=2):
    """
    Performs multi-hop graph traversal starting from a root entity.
    Returns connected entities, relation paths, and aggregated confidence.
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        visited_nodes = set()
        visited_edges = set()
        queue = [(root_entity.strip().lower(), 0, 1.0, [root_entity])]
        results = []
        
        while queue:
            curr_entity, depth, agg_conf, path = queue.pop(0)
            if depth >= max_depth:
                continue
            visited_nodes.add(curr_entity)
            
            cursor.execute("""
                SELECT * FROM graph_epistemic_triplets 
                WHERE (LOWER(subject) = ? OR LOWER(object) = ?) AND status = 'active'
            """, (curr_entity, curr_entity))
            neighbors = cursor.fetchall()
            
            for n in neighbors:
                e_id = n["id"]
                if e_id in visited_edges:
                    continue
                visited_edges.add(e_id)
                
                sub = n["subject"]
                pred = n["predicate"]
                obj = n["object"]
                is_neg = n["negative_constraint"]
                live_c = calculate_epistemic_decay(n["confidence"], n["updated_at"], n["decay_tau"])
                next_entity = obj.lower() if sub.lower() == curr_entity else sub.lower()
                next_agg_conf = round(agg_conf * live_c, 4)
                
                traversal_item = {
                    "id": e_id,
                    "from": sub,
                    "relation": pred,
                    "to": obj,
                    "confidence": live_c,
                    "aggregated_confidence": next_agg_conf,
                    "negative_constraint": is_neg,
                    "depth": depth + 1,
                    "path": path + [f"--[{pred}]-->", obj if sub.lower() == curr_entity else sub]
                }
                results.append(traversal_item)
                
                if next_entity not in visited_nodes and (depth + 1) < max_depth:
                    queue.append((next_entity, depth + 1, next_agg_conf, path + [f"--[{pred}]-->", obj if sub.lower() == curr_entity else sub]))
                    
        return {"status": "ok", "root_entity": root_entity, "depth": max_depth, "traversal_count": len(results), "graph": results}
    except Exception as e:
        log(f"Error in db_traverse_knowledge_graph: {e}")
        return {"status": "error", "error": str(e), "graph": []}
    finally:
        if conn:
            try: conn.close()
            except Exception: pass

def sync_epistemic_graph_markdown():
    """
    Dual-syncs all active epistemic triplets to a readable Markdown document.
    """
    conn = None
    try:
        os.makedirs(PM_KNOWLEDGE_GRAPH_DIR, exist_ok=True)
        out_path = os.path.join(PM_KNOWLEDGE_GRAPH_DIR, "triplets.md")
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM graph_epistemic_triplets WHERE status = 'active' ORDER BY negative_constraint ASC, confidence DESC")
        triplets = [dict(r) for r in cursor.fetchall()]
        
        md = f"# 🕸️ Dynamic Epistemic Knowledge Graph\n"
        md += f"*Auto-synced from SQLite: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M WIB')} | Total Active Triplets: {len(triplets)}*\n\n"
        md += "| Subjek (Source) | Predikat (Relasi) | Objek (Target) | Confidence | Decay State | Provenance | Negative Constraint |\n"
        md += "| :--- | :--- | :--- | :---: | :---: | :--- | :---: |\n"
        
        for t in triplets:
            live_c = calculate_epistemic_decay(t["confidence"], t["updated_at"], t.get("decay_tau", 2592000.0))
            is_neg = "🚨 Terlarang (Negative)" if t["negative_constraint"] else "✅ Valid"
            decay_pct = f"{int(live_c * 100)}%"
            md += f"| **{t['subject']}** | `{t['predicate']}` | **{t['object']}** | {t['confidence']} | {decay_pct} | `{t['source_kappa']}` | {is_neg} |\n"
            
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(md)
        return True
    except Exception as e:
        log(f"Error in sync_epistemic_graph_markdown: {e}")
        return False
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

    elif action == "db_list_item_history":
        res = db_list_item_history(msg.get("item_type", ""), msg.get("item_id", ""))
        res["id"] = req_id
        return res

    elif action == "db_rollback_item":
        res = db_rollback_item(msg.get("item_type", ""), msg.get("item_id", ""), msg.get("history_id"))
        res["id"] = req_id
        return res

    # Epistemic Knowledge Hypergraph RPC Actions
    elif action == "db_save_epistemic_triplet":
        res = db_upsert_epistemic_triplet(msg.get("triplet", {}))
        res["id"] = req_id
        return res

    elif action == "db_get_epistemic_graph":
        res = db_get_epistemic_graph(msg.get("search", ""), msg.get("include_pruned", False))
        res["id"] = req_id
        return res

    elif action == "db_resolve_epistemic_conflicts":
        res = db_upsert_epistemic_triplet(msg.get("triplet", {}))
        res["id"] = req_id
        return res

    elif action == "db_traverse_knowledge_graph":
        res = db_traverse_knowledge_graph(msg.get("root_entity", ""), msg.get("max_depth", 2))
        res["id"] = req_id
        return res

    elif action == "db_sync_persistent_memory_files":
        sync_persistent_memory_on_startup()
        sync_personal_facts_markdown()
        sync_failure_learnings_markdown()
        sync_epistemic_graph_markdown()
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

    elif action == "db_pin_session":
        res = db_pin_session(msg.get("session_id", ""), msg.get("is_pinned", True))
        res["id"] = req_id
        return res

    elif action == "db_rename_session":
        res = db_rename_session(msg.get("session_id", ""), msg.get("title", ""))
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

    elif action == "capture_os_screenshot":
        try:
            tmp_path = "/tmp/browser_agent_os_screenshot.png"
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except:
                    pass
            
            success = False
            desktop_env = os.environ.get("XDG_CURRENT_DESKTOP", "").upper()
            is_wayland = bool(os.environ.get("WAYLAND_DISPLAY"))

            # Build prioritized list of screenshot commands based on active desktop environment
            cmd_candidates = []
            if "KDE" in desktop_env or os.path.exists("/usr/bin/spectacle"):
                cmd_candidates.append(["spectacle", "-b", "-n", "-o", tmp_path])
            if is_wayland or os.path.exists("/usr/bin/grim"):
                cmd_candidates.append(["grim", tmp_path])
            if "GNOME" in desktop_env or os.path.exists("/usr/bin/gnome-screenshot"):
                cmd_candidates.append(["gnome-screenshot", "-f", tmp_path])
            
            # Standard Linux X11/generic CLI tools
            cmd_candidates.extend([
                ["spectacle", "-b", "-n", "-o", tmp_path],
                ["scrot", tmp_path],
                ["maim", tmp_path],
                ["import", "-window", "root", tmp_path]
            ])

            for cmd in cmd_candidates:
                try:
                    res = subprocess.run(cmd, capture_output=True, timeout=4)
                    if res.returncode == 0 and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                        success = True
                        break
                except Exception as ex:
                    log(f"Screenshot candidate {cmd[0]} error: {ex}")
                    continue

            # Fallback to PIL ImageGrab if CLI tools did not succeed
            if not success:
                try:
                    import PIL.ImageGrab
                    img = PIL.ImageGrab.grab()
                    img.save(tmp_path, "PNG")
                    success = os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0
                except Exception as pe:
                    log(f"PIL ImageGrab fallback note: {pe}")

            if success and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                final_path = tmp_path
                mime_type = "image/png"
                try:
                    from PIL import Image
                    with Image.open(tmp_path) as im:
                        if im.mode in ("RGBA", "P"):
                            im = im.convert("RGB")
                        im.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
                        opt_path = "/tmp/browser_agent_os_screenshot_opt.jpg"
                        im.save(opt_path, "JPEG", quality=85, optimize=True)
                        if os.path.exists(opt_path) and os.path.getsize(opt_path) > 0:
                            final_path = opt_path
                            mime_type = "image/jpeg"
                except Exception as opt_err:
                    log(f"Screenshot compression note: {opt_err}")

                with open(final_path, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                data_url = f"data:{mime_type};base64,{b64}"
                return {"id": req_id, "status": "ok", "data_url": data_url, "file_path": final_path}
            else:
                return {"id": req_id, "status": "error", "error": "Gagal mengambil screenshot desktop Linux"}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

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
    elif action == "open_application":
        app_name = msg.get("app_name") or msg.get("command") or msg.get("app")
        args = msg.get("args", "")
        if not app_name:
            return {"id": req_id, "status": "error", "error": "No application specified"}
        try:
            full_cmd = f"{app_name} {args}".strip()
            log(f"Launching Linux GUI app in background: {full_cmd}")
            subprocess.Popen(full_cmd, shell=True, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return {"id": req_id, "status": "ok", "message": f"Aplikasi '{app_name}' berhasil dibuka di Linux Desktop."}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "type_os_text":
        text = msg.get("text", "")
        press_enter = bool(msg.get("press_enter", False))
        if not text:
            return {"id": req_id, "status": "error", "error": "No text provided"}
        try:
            if os.path.exists('/usr/bin/xdotool'):
                subprocess.run(['xdotool', 'type', '--delay', '15', text], capture_output=True)
                if press_enter:
                    time.sleep(0.1)
                    subprocess.run(['xdotool', 'key', 'Return'], capture_output=True)
                return {"id": req_id, "status": "ok", "message": f"Berhasil mengetik ke jendela aktif via xdotool"}
            elif os.path.exists('/usr/bin/wtype'):
                subprocess.run(['wtype', text], capture_output=True)
                if press_enter:
                    time.sleep(0.1)
                    subprocess.run(['wtype', '-k', 'Return'], capture_output=True)
                return {"id": req_id, "status": "ok", "message": f"Berhasil mengetik ke jendela aktif via wtype"}
            elif os.path.exists('/usr/bin/ydotool'):
                subprocess.run(['ydotool', 'type', text], capture_output=True)
                if press_enter:
                    time.sleep(0.1)
                    subprocess.run(['ydotool', 'key', '28:1', '28:0'], capture_output=True)
                return {"id": req_id, "status": "ok", "message": f"Berhasil mengetik ke jendela aktif via ydotool"}
            else:
                return {"id": req_id, "status": "error", "error": "Tidak ditemukan tool simulasi ketik (xdotool/wtype/ydotool)"}
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

    elif action == "extract_document_text":
        file_path = msg.get("file_path")
        file_base64 = msg.get("file_base64")
        file_name = msg.get("file_name", "")
        try:
            raw_bytes = None
            if file_path and os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    raw_bytes = f.read()
            elif file_base64:
                if "," in file_base64:
                    file_base64 = file_base64.split(",", 1)[1]
                raw_bytes = base64.b64decode(file_base64)
            
            if not raw_bytes:
                return {"id": req_id, "status": "error", "error": "No file content or path provided"}
            
            lower_name = file_name.lower()
            text_result = ""
            
            # 1. PDF Extractor
            if lower_name.endswith(".pdf") or raw_bytes.startswith(b"%PDF"):
                import tempfile
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
                    tmp_pdf.write(raw_bytes)
                    tmp_pdf_path = tmp_pdf.name
                
                try:
                    if shutil.which("pdftotext"):
                        res = subprocess.run(["pdftotext", "-layout", tmp_pdf_path, "-"], capture_output=True, text=True, timeout=30)
                        text_result = res.stdout.strip()
                    if not text_result:
                        text_chunks = re.findall(r"\(([^\(\)]+)\)\s*T[jJ]", raw_bytes.decode("latin-1", errors="ignore"))
                        text_result = " ".join(text_chunks)
                finally:
                    if os.path.exists(tmp_pdf_path):
                        try:
                            os.remove(tmp_pdf_path)
                        except Exception:
                            pass
                        
            # 2. DOCX Extractor
            elif lower_name.endswith(".docx"):
                import zipfile, xml.etree.ElementTree as ET
                with zipfile.ZipFile(io.BytesIO(raw_bytes)) as z:
                    xml_content = z.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    texts = [node.text for node in tree.iter() if node.text]
                    text_result = " ".join(texts)
                    
            # 3. Plain Text / CSV / JSON / Code
            else:
                text_result = raw_bytes.decode("utf-8", errors="replace")
                
            return {
                "id": req_id,
                "status": "ok",
                "file_name": file_name,
                "text": text_result[:100000],
                "char_count": len(text_result)
            }
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "read_file_binary":
        path = os.path.expanduser(msg.get("path", ""))
        if not path:
            return {"id": req_id, "status": "error", "error": "No file path provided"}
        try:
            if not os.path.exists(path):
                return {"id": req_id, "status": "error", "error": f"File not found: {path}"}
            file_size = os.path.getsize(path)
            with open(path, "rb") as f:
                raw_bytes = f.read()
            b64_data = base64.b64encode(raw_bytes).decode("ascii")
            file_name = os.path.basename(path)
            return {
                "id": req_id,
                "status": "ok",
                "file_name": file_name,
                "file_size": file_size,
                "base64": b64_data,
                "path": path
            }
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "telegram_send_file":
        bot_token = msg.get("bot_token")
        chat_id = msg.get("chat_id")
        file_path = os.path.expanduser(msg.get("file_path", ""))
        content = msg.get("content")
        file_name = msg.get("file_name", "")
        caption = msg.get("caption", "")
        media_type = (msg.get("media_type") or "auto").lower()

        if not bot_token or not chat_id:
            return {"id": req_id, "status": "error", "error": "Missing bot_token or chat_id"}

        try:
            tmp_created = False
            target_path = file_path

            if content is not None and not file_path:
                import tempfile
                fname = file_name or "document.txt"
                tmp_f = tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix="_" + fname, delete=False)
                tmp_f.write(content)
                tmp_f.close()
                target_path = tmp_f.name
                tmp_created = True
                if not file_name:
                    file_name = fname

            if not target_path or not os.path.exists(target_path):
                return {"id": req_id, "status": "error", "error": f"File not found: {target_path}"}

            if not file_name:
                file_name = os.path.basename(target_path)

            lower_name = file_name.lower()
            endpoint_method = "sendDocument"
            file_field = "document"

            if media_type == "photo" or lower_name.endswith((".png", ".jpg", ".jpeg", ".webp")):
                endpoint_method = "sendPhoto"
                file_field = "photo"
            elif media_type == "audio" or lower_name.endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac")):
                endpoint_method = "sendAudio"
                file_field = "audio"
            elif media_type == "video" or lower_name.endswith((".mp4", ".mkv", ".mov", ".webm", ".avi")):
                endpoint_method = "sendVideo"
                file_field = "video"

            # Execute via curl subprocess for ultra fast, reliable multipart upload
            url = f"https://api.telegram.org/bot{bot_token}/{endpoint_method}"
            cmd = [
                "curl", "-s", "-X", "POST", url,
                "-F", f"chat_id={chat_id}",
                "-F", f"{file_field}=@{target_path};filename={file_name}"
            ]
            if caption:
                cmd.extend(["-F", f"caption={caption}"])

            res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            log(f"Telegram send file response: {res.stdout[:200]}")

            if tmp_created and os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except Exception:
                    pass

            try:
                res_json = json.loads(res.stdout)
                if res_json.get("ok"):
                    return {
                        "id": req_id,
                        "status": "ok",
                        "file_name": file_name,
                        "media_type": endpoint_method,
                        "message": f"Berkas '{file_name}' berhasil dikirim ke Telegram pengguna!"
                    }
                else:
                    return {"id": req_id, "status": "error", "error": res_json.get("description", "Upload failed")}
            except Exception:
                return {"id": req_id, "status": "ok", "file_name": file_name, "raw_response": res.stdout[:100]}
        except Exception as e:
            return {"id": req_id, "status": "error", "error": str(e)}

    elif action == "transcribe_audio":
        file_base64 = msg.get("file_base64", "")
        mime_type = msg.get("mime_type", "audio/ogg")
        api_key = msg.get("api_key", "")
        endpoint = msg.get("endpoint", "")
        preset = msg.get("preset", "")
        res = transcribe_audio_file(file_base64, mime_type, api_key, endpoint, preset)
        res["id"] = req_id
        return res

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
