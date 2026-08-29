// ==============================================================================
//  BROWSER AGENT - HIGH PERFORMANCE RUST NATIVE MESSAGING HOST & PERSISTENT BRAIN
//  Author: Arya <arstate>
//  Version: 2.150.113
//  Architecture: Zero-GC, Multithreaded, Bundled SQLite, Zero-Emoji Dark Luxury
// ==============================================================================

use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::Local;
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const CHUNK_SIZE: usize = 500 * 1024; // 500 KB limit per message chunk

static STDOUT_MUTEX: Mutex<()> = Mutex::new(());

fn log_msg(msg: &str) {
    let log_path = if cfg!(windows) {
        let temp = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Temp".to_string());
        PathBuf::from(temp).join("browser_agent_host.log")
    } else {
        PathBuf::from("/tmp/browser_agent_host.log")
    };

    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "[{}] {}", timestamp, msg);
    }
}

fn get_db_dir() -> PathBuf {
    let home = if cfg!(windows) {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("APPDATA"))
            .unwrap_or_else(|_| "C:\\".to_string())
    } else {
        std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
    };
    PathBuf::from(home).join(".browser-agent")
}

fn get_db_path() -> PathBuf {
    get_db_dir().join("chat_history.db")
}

fn init_db() -> Result<Connection, rusqlite::Error> {
    let db_dir = get_db_dir();
    let _ = fs::create_dir_all(&db_dir);
    let _ = fs::create_dir_all(db_dir.join("generated_images"));
    let _ = fs::create_dir_all(db_dir.join("walkthrough_screenshots"));
    let _ = fs::create_dir_all(db_dir.join("agents"));
    let _ = fs::create_dir_all(db_dir.join("skills"));
    let _ = fs::create_dir_all(db_dir.join("memories"));

    let pm_root = db_dir.join("PERSISTENT MEMORY");
    let _ = fs::create_dir_all(&pm_root);
    let _ = fs::create_dir_all(pm_root.join("user_profile"));
    let _ = fs::create_dir_all(pm_root.join("experience_ledger"));
    let _ = fs::create_dir_all(pm_root.join("anti_patterns"));
    let _ = fs::create_dir_all(pm_root.join("autonomous_skills"));
    let _ = fs::create_dir_all(pm_root.join("autonomous_agents"));
    let _ = fs::create_dir_all(pm_root.join("training_corpus"));
    let _ = fs::create_dir_all(pm_root.join(".history"));
    let _ = fs::create_dir_all(pm_root.join("knowledge_graph"));

    let conn = Connection::open(get_db_path())?;

    // Enable WAL mode for high concurrent read/write throughput
    let _ = conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

    conn.execute_batch(
        "
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
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_pinned_updated ON sessions(is_pinned DESC, updated_at DESC);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS model_configs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            model_id TEXT NOT NULL,
            priority_order INTEGER DEFAULT 0,
            is_primary INTEGER DEFAULT 0,
            config_json TEXT DEFAULT '{}',
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_model_priority ON model_configs(priority_order ASC);

        CREATE TABLE IF NOT EXISTS user_memories (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT DEFAULT 'autonomous_ai',
            reason TEXT DEFAULT '',
            confidence REAL DEFAULT 1.0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_user_memories_cat ON user_memories(category);

        CREATE TABLE IF NOT EXISTS experience_ledger (
            id TEXT PRIMARY KEY,
            session_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            distilled_markdown TEXT NOT NULL,
            key_learnings_json TEXT DEFAULT '[]',
            tags TEXT DEFAULT '',
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_exp_ledger_created ON experience_ledger(created_at DESC);

        CREATE TABLE IF NOT EXISTS anti_patterns (
            id TEXT PRIMARY KEY,
            target_domain TEXT NOT NULL,
            mistake_description TEXT NOT NULL,
            root_cause TEXT DEFAULT '',
            winning_fix TEXT NOT NULL,
            prevention_rule TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_anti_patterns_domain ON anti_patterns(target_domain);

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
        );

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
        );

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
        );
        CREATE INDEX IF NOT EXISTS idx_training_corpus_updated ON chat_training_corpus(updated_at DESC);

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
        );
        CREATE INDEX IF NOT EXISTS idx_history_item ON persistent_item_history(item_type, item_id, created_at DESC);

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
        );
        CREATE INDEX IF NOT EXISTS idx_epistemic_sub_pred ON graph_epistemic_triplets(subject, predicate);
        CREATE INDEX IF NOT EXISTS idx_epistemic_status_neg ON graph_epistemic_triplets(status, negative_constraint);
        CREATE INDEX IF NOT EXISTS idx_epistemic_updated ON graph_epistemic_triplets(updated_at DESC);
        "
    )?;

    Ok(conn)
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

// Read Native Messaging format (4-byte length + UTF-8 JSON)
fn read_message<R: Read>(reader: &mut R) -> Option<Value> {
    let mut len_bytes = [0u8; 4];
    if reader.read_exact(&mut len_bytes).is_err() {
        return None;
    }
    let length = u32::from_ne_bytes(len_bytes) as usize;
    if length == 0 || length > 100 * 1024 * 1024 {
        log_msg(&format!("Invalid message length: {}", length));
        return None;
    }

    let mut buf = vec![0u8; length];
    if reader.read_exact(&mut buf).is_err() {
        log_msg("Failed to read full message payload");
        return None;
    }

    serde_json::from_slice(&buf).ok()
}

// Write Native Messaging format (4-byte length + UTF-8 JSON) with 500KB Chunking
fn write_message<W: Write>(writer: &mut W, value: &Value) {
    let _lock = STDOUT_MUTEX.lock().unwrap();
    let serialized = match serde_json::to_vec(value) {
        Ok(b) => b,
        Err(e) => {
            log_msg(&format!("JSON serialization error: {}", e));
            return;
        }
    };

    if serialized.len() > CHUNK_SIZE {
        if let Some(req_id) = value.get("id").and_then(|v| v.as_str()) {
            if value.get("is_chunk").is_none() {
                let raw_str = String::from_utf8_lossy(&serialized);
                let total_chunks = (raw_str.len() + CHUNK_SIZE - 1) / CHUNK_SIZE;
                for i in 0..total_chunks {
                    let start = i * CHUNK_SIZE;
                    let end = (start + CHUNK_SIZE).min(raw_str.len());
                    let chunk_slice = &raw_str[start..end];
                    let chunk_msg = json!({
                        "id": req_id,
                        "is_chunk": true,
                        "chunk_index": i,
                        "total_chunks": total_chunks,
                        "chunk_data": chunk_slice
                    });
                    if let Ok(chunk_bytes) = serde_json::to_vec(&chunk_msg) {
                        let len_bytes = (chunk_bytes.len() as u32).to_ne_bytes();
                        let _ = writer.write_all(&len_bytes);
                        let _ = writer.write_all(&chunk_bytes);
                        let _ = writer.flush();
                    }
                }
                return;
            }
        }
    }

    let len_bytes = (serialized.len() as u32).to_ne_bytes();
    let _ = writer.write_all(&len_bytes);
    let _ = writer.write_all(&serialized);
    let _ = writer.flush();
}

// Parse markdown file with YAML frontmatter
fn parse_md_file(path: &Path) -> Option<(Value, String)> {
    let raw = fs::read_to_string(path).ok()?;
    let mut meta = json!({});
    let mut content = raw.clone();

    if raw.starts_with("---") {
        let parts: Vec<&str> = raw.split("---").collect();
        if parts.len() >= 3 {
            let header = parts[1].trim();
            for line in header.lines() {
                if let Some((k, v)) = line.split_once(':') {
                    let key = k.trim().to_string();
                    let val_str = v.trim();
                    let parsed_val: Value = if (val_str.starts_with('"') && val_str.ends_with('"'))
                        || (val_str.starts_with('\'') && val_str.ends_with('\''))
                    {
                        json!(val_str[1..val_str.len() - 1].to_string())
                    } else if let Ok(parsed_json) = serde_json::from_str::<Value>(val_str) {
                        parsed_json
                    } else if val_str.eq_ignore_ascii_case("true") {
                        json!(true)
                    } else if val_str.eq_ignore_ascii_case("false") {
                        json!(false)
                    } else if let Ok(num) = val_str.parse::<i64>() {
                        json!(num)
                    } else {
                        json!(val_str)
                    };
                    meta[key] = parsed_val;
                }
            }
            content = parts[2..].join("---").trim().to_string();
        }
    }

    Some((meta, content))
}

// Write markdown file with YAML frontmatter
fn write_md_file(path: &Path, meta: &Value, content: &str) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut out = String::from("---\n");
    if let Some(obj) = meta.as_object() {
        for (k, v) in obj {
            match v {
                Value::String(s) => out.push_str(&format!("{}: \"{}\"\n", k, s)),
                _ => out.push_str(&format!("{}: {}\n", k, v)),
            }
        }
    }
    out.push_str("---\n\n");
    out.push_str(content.trim());
    out.push('\n');

    fs::write(path, out)
}

fn handle_rpc(msg: Value, conn: &Connection) -> Value {
    let req_id = msg.get("id").cloned().unwrap_or(json!(null));
    let action = msg.get("action").and_then(|v| v.as_str()).unwrap_or("");

    let mut response = match action {
        "ping" => json!({
            "status": "ok",
            "message": "Rust Native Host Online",
            "version": "2.150.113",
            "runtime": "Rust 1.98 (Zero-GC, Native Binary)",
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH
        }),

        "auto_update" => {
            let repo_dir = std::env::current_dir().unwrap_or_else(|_| get_db_dir());
            log_msg(&format!("Running git pull in {:?}", repo_dir));
            let output = Command::new("git")
                .args(["pull", "origin", "master"])
                .current_dir(&repo_dir)
                .output();

            match output {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    let combined = format!("{}{}", stdout, stderr);
                    let _ = Command::new("python3")
                        .arg("build_crx.py")
                        .current_dir(&repo_dir)
                        .output();

                    json!({
                        "status": "ok",
                        "success": out.status.success(),
                        "output": combined
                    })
                }
                Err(e) => json!({
                    "status": "error",
                    "error": format!("Git pull error: {}", e)
                }),
            }
        }

        "run_command" => {
            let cmd = msg
                .get("command")
                .or_else(|| msg.get("cmd"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let cwd = msg
                .get("cwd")
                .and_then(|v| v.as_str())
                .map(PathBuf::from)
                .unwrap_or_else(|| {
                    if cfg!(windows) {
                        PathBuf::from("C:\\")
                    } else {
                        PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string()))
                    }
                });

            if cmd.is_empty() {
                json!({ "status": "error", "error": "No command provided" })
            } else {
                let res = if cfg!(windows) {
                    Command::new("cmd")
                        .args(["/C", cmd])
                        .current_dir(&cwd)
                        .output()
                } else {
                    Command::new("bash")
                        .args(["-c", cmd])
                        .current_dir(&cwd)
                        .output()
                };

                match res {
                    Ok(out) => json!({
                        "status": "ok",
                        "stdout": String::from_utf8_lossy(&out.stdout),
                        "stderr": String::from_utf8_lossy(&out.stderr),
                        "exit_code": out.status.code().unwrap_or(0)
                    }),
                    Err(e) => json!({ "status": "error", "error": e.to_string() }),
                }
            }
        }

        "open_application" => {
            let app = msg
                .get("app_name")
                .or_else(|| msg.get("command"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if app.is_empty() {
                json!({ "status": "error", "error": "No application specified" })
            } else {
                let _ = Command::new(app).spawn();
                json!({ "status": "ok", "message": format!("Application '{}' launched", app) })
            }
        }

        // ==========================================
        // SESSIONS RPC HANDLERS
        // ==========================================
        "db_save_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let title = msg.get("title").and_then(|v| v.as_str()).unwrap_or("Percakapan Baru");
            let model = msg.get("model").and_then(|v| v.as_str()).unwrap_or("");
            let count = msg.get("message_count").and_then(|v| v.as_i64()).unwrap_or(0);
            let preview = msg.get("preview").and_then(|v| v.as_str()).unwrap_or("");
            let messages = msg.get("messages_json").and_then(|v| v.as_str()).unwrap_or("[]");
            let is_pinned = msg.get("is_pinned").and_then(|v| v.as_i64()).unwrap_or(0);
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO sessions (id, title, model, message_count, preview, messages_json, is_pinned, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    model = excluded.model,
                    message_count = excluded.message_count,
                    preview = excluded.preview,
                    messages_json = excluded.messages_json,
                    is_pinned = excluded.is_pinned,
                    updated_at = excluded.updated_at",
                params![sid, title, model, count, preview, messages, is_pinned, now],
            );

            match res {
                Ok(_) => json!({ "status": "ok", "session_id": sid }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_get_sessions" => {
            let mut stmt = conn.prepare(
                "SELECT id, title, model, message_count, preview, is_pinned, created_at, updated_at
                 FROM sessions ORDER BY is_pinned DESC, updated_at DESC",
            );
            match stmt {
                Ok(mut s) => {
                    let rows = s.query_map([], |r| {
                        Ok(json!({
                            "id": r.get::<_, String>(0)?,
                            "title": r.get::<_, String>(1)?,
                            "model": r.get::<_, String>(2)?,
                            "message_count": r.get::<_, i64>(3)?,
                            "preview": r.get::<_, String>(4)?,
                            "is_pinned": r.get::<_, i64>(5)?,
                            "created_at": r.get::<_, i64>(6)?,
                            "updated_at": r.get::<_, i64>(7)?
                        }))
                    });
                    let list: Vec<Value> = rows.map(|iter| iter.filter_map(|x| x.ok()).collect()).unwrap_or_default();
                    json!({ "status": "ok", "sessions": list })
                }
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_get_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let mut stmt = conn.prepare("SELECT id, title, model, messages_json, is_pinned, created_at, updated_at FROM sessions WHERE id = ?1");
            match stmt {
                Ok(mut s) => {
                    let session = s.query_row(params![sid], |r| {
                        Ok(json!({
                            "id": r.get::<_, String>(0)?,
                            "title": r.get::<_, String>(1)?,
                            "model": r.get::<_, String>(2)?,
                            "messages_json": r.get::<_, String>(3)?,
                            "is_pinned": r.get::<_, i64>(4)?,
                            "created_at": r.get::<_, i64>(5)?,
                            "updated_at": r.get::<_, i64>(6)?
                        }))
                    }).ok();
                    match session {
                        Some(sess) => json!({ "status": "ok", "session": sess }),
                        None => json!({ "status": "error", "error": "Session not found" }),
                    }
                }
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_delete_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let res = conn.execute("DELETE FROM sessions WHERE id = ?1", params![sid]);
            match res {
                Ok(_) => json!({ "status": "ok", "session_id": sid }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_pin_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let pin = msg.get("is_pinned").and_then(|v| v.as_i64()).unwrap_or(0);
            let res = conn.execute("UPDATE sessions SET is_pinned = ?1 WHERE id = ?2", params![pin, sid]);
            match res {
                Ok(_) => json!({ "status": "ok", "session_id": sid }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        // ==========================================
        // SETTINGS & MODELS RPC HANDLERS
        // ==========================================
        "db_save_setting" => {
            let key = msg.get("key").and_then(|v| v.as_str()).unwrap_or("");
            let val = msg.get("value_json").and_then(|v| v.as_str()).unwrap_or("{}");
            let now = now_millis();
            let res = conn.execute(
                "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
                params![key, val, now],
            );
            match res {
                Ok(_) => json!({ "status": "ok", "key": key }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_get_setting" => {
            let key = msg.get("key").and_then(|v| v.as_str()).unwrap_or("");
            let val: Option<String> = conn.query_row("SELECT value_json FROM settings WHERE key = ?1", params![key], |r| r.get(0)).ok();
            match val {
                Some(v) => json!({ "status": "ok", "key": key, "value_json": v }),
                None => json!({ "status": "not_found", "key": key }),
            }
        }

        "db_get_all_settings" => {
            let mut stmt = conn.prepare("SELECT key, value_json FROM settings");
            match stmt {
                Ok(mut s) => {
                    let mut settings_map = serde_json::Map::new();
                    let rows = s.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)));
                    if let Ok(iter) = rows {
                        for pair in iter.flatten() {
                            if let Ok(v) = serde_json::from_str::<Value>(&pair.1) {
                                settings_map.insert(pair.0, v);
                            } else {
                                settings_map.insert(pair.0, json!(pair.1));
                            }
                        }
                    }
                    json!({ "status": "ok", "settings": settings_map })
                }
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        // ==========================================
        // PERSISTENT MEMORY RPC HANDLERS
        // ==========================================
        "db_get_persistent_memory" => {
            // Load user_memories
            let mut memories = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, category, content, source, reason, confidence, created_at, updated_at FROM user_memories ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], |r| Ok(json!({
                    "id": r.get::<_, String>(0)?,
                    "category": r.get::<_, String>(1)?,
                    "content": r.get::<_, String>(2)?,
                    "source": r.get::<_, String>(3)?,
                    "reason": r.get::<_, String>(4)?,
                    "confidence": r.get::<_, f64>(5)?,
                    "created_at": r.get::<_, i64>(6)?,
                    "updated_at": r.get::<_, i64>(7)?
                }))) {
                    memories = iter.flatten().collect();
                }
            }

            // Load experience_ledger
            let mut ledger = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, session_id, title, distilled_markdown, key_learnings_json, tags, created_at FROM experience_ledger ORDER BY created_at DESC") {
                if let Ok(iter) = s.query_map([], |r| Ok(json!({
                    "id": r.get::<_, String>(0)?,
                    "session_id": r.get::<_, String>(1)?,
                    "title": r.get::<_, String>(2)?,
                    "distilled_markdown": r.get::<_, String>(3)?,
                    "key_learnings_json": r.get::<_, String>(4)?,
                    "tags": r.get::<_, String>(5)?,
                    "created_at": r.get::<_, i64>(6)?
                }))) {
                    ledger = iter.flatten().collect();
                }
            }

            // Load anti_patterns
            let mut anti_patterns = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at FROM anti_patterns ORDER BY created_at DESC") {
                if let Ok(iter) = s.query_map([], |r| Ok(json!({
                    "id": r.get::<_, String>(0)?,
                    "target_domain": r.get::<_, String>(1)?,
                    "mistake_description": r.get::<_, String>(2)?,
                    "root_cause": r.get::<_, String>(3)?,
                    "winning_fix": r.get::<_, String>(4)?,
                    "prevention_rule": r.get::<_, String>(5)?,
                    "created_at": r.get::<_, i64>(6)?
                }))) {
                    anti_patterns = iter.flatten().collect();
                }
            }

            // Load autonomous_skills
            let mut skills = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at FROM autonomous_skills ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], |r| Ok(json!({
                    "id": r.get::<_, String>(0)?,
                    "name": r.get::<_, String>(1)?,
                    "description": r.get::<_, String>(2)?,
                    "workflow_markdown": r.get::<_, String>(3)?,
                    "version": r.get::<_, String>(4)?,
                    "source": r.get::<_, String>(5)?,
                    "success_count": r.get::<_, i64>(6)?,
                    "failure_count": r.get::<_, i64>(7)?,
                    "changelog": r.get::<_, String>(8)?,
                    "created_at": r.get::<_, i64>(9)?,
                    "updated_at": r.get::<_, i64>(10)?
                }))) {
                    skills = iter.flatten().collect();
                }
            }

            // Load autonomous_agents
            let mut agents = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at FROM autonomous_agents ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], |r| Ok(json!({
                    "id": r.get::<_, String>(0)?,
                    "name": r.get::<_, String>(1)?,
                    "role_description": r.get::<_, String>(2)?,
                    "system_prompt": r.get::<_, String>(3)?,
                    "assigned_skills_json": r.get::<_, String>(4)?,
                    "source": r.get::<_, String>(5)?,
                    "reason": r.get::<_, String>(6)?,
                    "created_at": r.get::<_, i64>(7)?,
                    "updated_at": r.get::<_, i64>(8)?
                }))) {
                    agents = iter.flatten().collect();
                }
            }

            json!({
                "status": "ok",
                "vault": {
                    "user_memories": memories,
                    "experience_ledger": ledger,
                    "anti_patterns": anti_patterns,
                    "autonomous_skills": skills,
                    "autonomous_agents": agents
                }
            })
        }

        "db_save_personal_memory" => {
            let id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let cat = msg.get("category").and_then(|v| v.as_str()).unwrap_or("rules");
            let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let source = msg.get("source").and_then(|v| v.as_str()).unwrap_or("user");
            let reason = msg.get("reason").and_then(|v| v.as_str()).unwrap_or("");
            let conf = msg.get("confidence").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO user_memories (id, category, content, source, reason, confidence, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
                 ON CONFLICT(id) DO UPDATE SET category = excluded.category, content = excluded.content, updated_at = excluded.updated_at",
                params![id, cat, content, source, reason, conf, now],
            );
            match res {
                Ok(_) => json!({ "status": "ok", "id": id }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_delete_persistent_item" => {
            let itype = msg.get("item_type").and_then(|v| v.as_str()).unwrap_or("");
            let id = msg.get("item_id").and_then(|v| v.as_str()).unwrap_or("");
            let table = match itype {
                "user_profile" | "user_memories" => "user_memories",
                "experience_ledger" => "experience_ledger",
                "anti_patterns" => "anti_patterns",
                "autonomous_skills" => "autonomous_skills",
                "autonomous_agents" => "autonomous_agents",
                _ => "",
            };

            if table.is_empty() {
                json!({ "status": "error", "error": "Invalid item type" })
            } else {
                let _ = conn.execute(&format!("DELETE FROM {} WHERE id = ?1", table), params![id]);
                json!({ "status": "ok", "id": id })
            }
        }

        // ==========================================
        // EPISTEMIC GRAPH RPC HANDLERS
        // ==========================================
        "db_save_epistemic_triplet" => {
            let id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let sub = msg.get("subject").and_then(|v| v.as_str()).unwrap_or("");
            let pred = msg.get("predicate").and_then(|v| v.as_str()).unwrap_or("");
            let obj = msg.get("object").and_then(|v| v.as_str()).unwrap_or("");
            let conf = msg.get("confidence").and_then(|v| v.as_f64()).unwrap_or(1.0);
            let tau = msg.get("decay_tau").and_then(|v| v.as_f64()).unwrap_or(2592000.0);
            let kappa = msg.get("source_kappa").and_then(|v| v.as_str()).unwrap_or("user_chat");
            let neg = msg.get("negative_constraint").and_then(|v| v.as_i64()).unwrap_or(0);
            let status = msg.get("status").and_then(|v| v.as_str()).unwrap_or("active");
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO graph_epistemic_triplets (id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
                 ON CONFLICT(id) DO UPDATE SET confidence = excluded.confidence, status = excluded.status, updated_at = excluded.updated_at",
                params![id, sub, pred, obj, conf, tau, kappa, neg, status, now],
            );
            match res {
                Ok(_) => json!({ "status": "ok", "id": id }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_get_epistemic_graph" => {
            let mut stmt = conn.prepare(
                "SELECT id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at
                 FROM graph_epistemic_triplets ORDER BY updated_at DESC",
            );
            match stmt {
                Ok(mut s) => {
                    let rows = s.query_map([], |r| {
                        Ok(json!({
                            "id": r.get::<_, String>(0)?,
                            "subject": r.get::<_, String>(1)?,
                            "predicate": r.get::<_, String>(2)?,
                            "object": r.get::<_, String>(3)?,
                            "confidence": r.get::<_, f64>(4)?,
                            "decay_tau": r.get::<_, f64>(5)?,
                            "source_kappa": r.get::<_, String>(6)?,
                            "negative_constraint": r.get::<_, i64>(7)?,
                            "status": r.get::<_, String>(8)?,
                            "created_at": r.get::<_, i64>(9)?,
                            "updated_at": r.get::<_, i64>(10)?
                        }))
                    });
                    let triplets: Vec<Value> = rows.map(|iter| iter.filter_map(|x| x.ok()).collect()).unwrap_or_default();
                    json!({ "status": "ok", "triplets": triplets })
                }
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        // ==========================================
        // MD FILES (SKILLS, AGENTS, MEMORIES) RPCs
        // ==========================================
        "list_skills" => {
            let skills_dir = get_db_dir().join("skills");
            let mut items = vec![];
            if let Ok(entries) = fs::read_dir(skills_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) == Some("md") {
                        if let Some((mut meta, content)) = parse_md_file(&p) {
                            meta["content"] = json!(content);
                            meta["file_path"] = json!(p.to_string_lossy());
                            items.push(meta);
                        }
                    }
                }
            }
            json!({ "status": "ok", "items": items })
        }

        "list_agents" => {
            let agents_dir = get_db_dir().join("agents");
            let mut items = vec![];
            if let Ok(entries) = fs::read_dir(agents_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) == Some("md") {
                        if let Some((mut meta, content)) = parse_md_file(&p) {
                            meta["content"] = json!(content);
                            meta["file_path"] = json!(p.to_string_lossy());
                            items.push(meta);
                        }
                    }
                }
            }
            json!({ "status": "ok", "items": items })
        }

        "list_memories" => {
            let mem_dir = get_db_dir().join("memories");
            let mut items = vec![];
            if let Ok(entries) = fs::read_dir(mem_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) == Some("md") {
                        if let Some((mut meta, content)) = parse_md_file(&p) {
                            meta["content"] = json!(content);
                            meta["file_path"] = json!(p.to_string_lossy());
                            items.push(meta);
                        }
                    }
                }
            }
            json!({ "status": "ok", "items": items })
        }

        _ => json!({
            "status": "ok",
            "message": format!("Action '{}' handled by Rust Native Host", action)
        }),
    };

    if let Some(obj) = response.as_object_mut() {
        obj.insert("id".to_string(), req_id);
    }
    response
}

fn main() {
    log_msg("=========================================================");
    log_msg("  Browser Agent Rust Native Host v2.150.113 starting...");
    log_msg("=========================================================");

    let conn = match init_db() {
        Ok(c) => c,
        Err(e) => {
            log_msg(&format!("FATAL: Failed to initialize SQLite database: {}", e));
            return;
        }
    };

    let mut stdin = io::stdin();
    let mut stdout = io::stdout();

    while let Some(msg) = read_message(&mut stdin) {
        let resp = handle_rpc(msg, &conn);
        write_message(&mut stdout, &resp);
    }

    log_msg("Browser Agent Rust Native Host shutting down cleanly.");
}
