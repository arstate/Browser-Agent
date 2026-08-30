// ==============================================================================
//  BROWSER AGENT - HIGH PERFORMANCE RUST NATIVE MESSAGING HOST & PERSISTENT BRAIN
//  Author: Arya <arstate>
//  Version: 2.150.116
//  Architecture: Zero-GC, Multithreaded, Bundled SQLite, Zero-Emoji Dark Luxury
// ==============================================================================

use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::prelude::*;
use chrono::Local;
use rusqlite::{params, Connection, Row};
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

fn expand_path(raw: &str) -> PathBuf {
    let clean = raw.trim();
    if clean.starts_with("~/") || clean == "~" {
        let home = if cfg!(windows) {
            std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
        } else {
            std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string())
        };
        if clean == "~" {
            PathBuf::from(home)
        } else {
            PathBuf::from(home).join(&clean[2..])
        }
    } else {
        PathBuf::from(clean)
    }
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

    // Enable WAL mode for ultra fast concurrent read/write throughput
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

    let _ = heal_sessions(&conn);
    Ok(conn)
}

fn heal_sessions(conn: &Connection) {
    if let Ok(mut stmt) = conn.prepare("SELECT id, messages_json FROM sessions WHERE (message_count = 0 OR preview = '' OR preview IS NULL) AND messages_json != '[]' AND messages_json != ''") {
        let rows: Vec<(String, String)> = stmt.query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        }).map(|iter| iter.flatten().collect()).unwrap_or_default();

        for (sid, msgs_str) in rows {
            if let Ok(msgs) = serde_json::from_str::<Vec<Value>>(&msgs_str) {
                if !msgs.is_empty() {
                    let count = msgs.len() as i64;
                    let mut prev = String::new();
                    for m in &msgs {
                        let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("");
                        if role == "user" {
                            if let Some(c) = m.get("content").and_then(|v| v.as_str()) {
                                let trimmed = c.trim();
                                if !trimmed.is_empty() {
                                    prev = trimmed.chars().take(150).collect();
                                    break;
                                }
                            } else if let Some(arr) = m.get("content").and_then(|v| v.as_array()) {
                                for item in arr {
                                    if let Some(txt) = item.get("text").and_then(|v| v.as_str()) {
                                        let trimmed = txt.trim();
                                        if !trimmed.is_empty() {
                                            prev = trimmed.chars().take(150).collect();
                                            break;
                                        }
                                    }
                                }
                                if !prev.is_empty() { break; }
                            }
                        }
                    }
                    if prev.is_empty() {
                        if let Some(first) = msgs.first() {
                            if let Some(c) = first.get("content").and_then(|v| v.as_str()) {
                                prev = c.trim().chars().take(150).collect();
                            }
                        }
                    }
                    let _ = conn.execute(
                        "UPDATE sessions SET message_count = ?1, preview = ?2 WHERE id = ?3",
                        params![count, prev, sid],
                    );
                }
            }
        }
    }
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn calculate_epistemic_decay(confidence: f64, last_updated_ms: i64, decay_tau: f64) -> f64 {
    let now_ms = now_millis();
    let delta_sec = ((now_ms - last_updated_ms) as f64 / 1000.0).max(0.0);
    let tau = decay_tau.max(60.0);
    let factor = (- (2.0f64.ln() / tau) * delta_sec).exp();
    let decayed = confidence * factor;
    (decayed.min(1.0).max(0.01) * 10000.0).round() / 10000.0
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

// Write Native Messaging format (4-byte length + UTF-8 JSON) with Safe UTF-8 500KB Chunking
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
        if let Some(req_id) = value.get("id") {
            if value.get("is_chunk").is_none() {
                let raw_str = String::from_utf8_lossy(&serialized);
                let mut chunks: Vec<String> = Vec::new();
                let mut current_idx = 0;
                while current_idx < raw_str.len() {
                    let mut end = (current_idx + CHUNK_SIZE).min(raw_str.len());
                    while end > current_idx && !raw_str.is_char_boundary(end) {
                        end -= 1;
                    }
                    if end == current_idx {
                        end = (current_idx + 4).min(raw_str.len());
                        while end < raw_str.len() && !raw_str.is_char_boundary(end) {
                            end += 1;
                        }
                    }
                    chunks.push(raw_str[current_idx..end].to_string());
                    current_idx = end;
                }

                let total_chunks = chunks.len();
                for (i, chunk_data) in chunks.into_iter().enumerate() {
                    let chunk_msg = json!({
                        "id": req_id,
                        "is_chunk": true,
                        "chunk_index": i,
                        "total_chunks": total_chunks,
                        "chunk_data": chunk_data
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

fn save_md_item(dir: &Path, item: &Value) -> Result<String, String> {
    let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
    if id.is_empty() {
        return Err("Item ID is required".to_string());
    }

    let _ = fs::create_dir_all(dir);
    let file_path = dir.join(format!("{}.md", id));

    let content = item.get("content").and_then(|v| v.as_str())
        .or_else(|| item.get("prompt").and_then(|v| v.as_str()))
        .unwrap_or("");

    let mut frontmatter = String::from("---\n");
    if let Some(obj) = item.as_object() {
        for (k, v) in obj {
            if k != "content" && k != "file_path" {
                if let Some(s) = v.as_str() {
                    frontmatter.push_str(&format!("{}: \"{}\"\n", k, s.replace('"', "\\\"")));
                } else {
                    frontmatter.push_str(&format!("{}: {}\n", k, v));
                }
            }
        }
    }
    frontmatter.push_str("---\n\n");
    frontmatter.push_str(content);

    fs::write(&file_path, frontmatter).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

fn delete_md_item(dir: &Path, id: &str) -> Result<(), String> {
    if id.trim().is_empty() {
        return Err("ID required".to_string());
    }
    let file_path = dir.join(format!("{}.md", id.trim()));
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn map_user_memory(r: &Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": r.get::<_, String>(0)?,
        "category": r.get::<_, String>(1)?,
        "content": r.get::<_, String>(2)?,
        "source": r.get::<_, String>(3)?,
        "reason": r.get::<_, String>(4)?,
        "confidence": r.get::<_, f64>(5)?,
        "created_at": r.get::<_, i64>(6)?,
        "updated_at": r.get::<_, i64>(7)?
    }))
}

fn map_experience_ledger(r: &Row) -> rusqlite::Result<Value> {
    let kl_str: String = r.get(4).unwrap_or_else(|_| "[]".to_string());
    let kl_val: Value = serde_json::from_str(&kl_str).unwrap_or(json!([]));
    Ok(json!({
        "id": r.get::<_, String>(0)?,
        "session_id": r.get::<_, String>(1)?,
        "title": r.get::<_, String>(2)?,
        "distilled_markdown": r.get::<_, String>(3)?,
        "key_learnings": kl_val,
        "key_learnings_json": kl_str,
        "tags": r.get::<_, String>(5)?,
        "created_at": r.get::<_, i64>(6)?
    }))
}

fn map_anti_pattern(r: &Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": r.get::<_, String>(0)?,
        "target_domain": r.get::<_, String>(1)?,
        "mistake_description": r.get::<_, String>(2)?,
        "root_cause": r.get::<_, String>(3)?,
        "winning_fix": r.get::<_, String>(4)?,
        "prevention_rule": r.get::<_, String>(5)?,
        "created_at": r.get::<_, i64>(6)?
    }))
}

fn map_autonomous_skill(r: &Row) -> rusqlite::Result<Value> {
    Ok(json!({
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
    }))
}

fn map_autonomous_agent(r: &Row) -> rusqlite::Result<Value> {
    let ask_str: String = r.get(4).unwrap_or_else(|_| "[]".to_string());
    let ask_val: Value = serde_json::from_str(&ask_str).unwrap_or(json!([]));
    Ok(json!({
        "id": r.get::<_, String>(0)?,
        "name": r.get::<_, String>(1)?,
        "role_description": r.get::<_, String>(2)?,
        "system_prompt": r.get::<_, String>(3)?,
        "assigned_skills": ask_val,
        "assigned_skills_json": ask_str,
        "source": r.get::<_, String>(5)?,
        "reason": r.get::<_, String>(6)?,
        "created_at": r.get::<_, i64>(7)?,
        "updated_at": r.get::<_, i64>(8)?
    }))
}

fn map_training_corpus(r: &Row) -> rusqlite::Result<Value> {
    let ki_str: String = r.get(5).unwrap_or_else(|_| "[]".to_string());
    let tw_str: String = r.get(6).unwrap_or_else(|_| "[]".to_string());
    let ln_str: String = r.get(7).unwrap_or_else(|_| "[]".to_string());
    Ok(json!({
        "id": r.get::<_, String>(0)?,
        "session_id": r.get::<_, String>(1)?,
        "title": r.get::<_, String>(2)?,
        "model": r.get::<_, String>(3)?,
        "distilled_points_md": r.get::<_, String>(4)?,
        "key_intents": serde_json::from_str::<Value>(&ki_str).unwrap_or(json!([])),
        "tool_workflows": serde_json::from_str::<Value>(&tw_str).unwrap_or(json!([])),
        "learnings": serde_json::from_str::<Value>(&ln_str).unwrap_or(json!([])),
        "token_saved_estimate": r.get::<_, i64>(8)?,
        "created_at": r.get::<_, i64>(9)?,
        "updated_at": r.get::<_, i64>(10)?
    }))
}

fn map_epistemic_triplet(r: &Row) -> rusqlite::Result<Value> {
    let conf: f64 = r.get(4)?;
    let tau: f64 = r.get(5)?;
    let up_ms: i64 = r.get(10)?;
    let decayed = calculate_epistemic_decay(conf, up_ms, tau);
    Ok(json!({
        "id": r.get::<_, String>(0)?,
        "subject": r.get::<_, String>(1)?,
        "predicate": r.get::<_, String>(2)?,
        "object": r.get::<_, String>(3)?,
        "confidence": conf,
        "decay_tau": tau,
        "source_kappa": r.get::<_, String>(6)?,
        "negative_constraint": r.get::<_, i64>(7)?,
        "status": r.get::<_, String>(8)?,
        "created_at": r.get::<_, i64>(9)?,
        "updated_at": up_ms,
        "decayed_confidence": decayed
    }))
}

fn prune_messages_for_rpc(messages: &[Value]) -> Vec<Value> {
    let mut pruned = Vec::with_capacity(messages.len());
    for m in messages {
        let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("");
        if role == "tool" {
            let mut clean = json!({
                "role": "tool",
                "content": "{\"status\":\"success\"}"
            });
            if let Some(name) = m.get("name") {
                clean["name"] = name.clone();
            }
            if let Some(tcid) = m.get("tool_call_id") {
                clean["tool_call_id"] = tcid.clone();
            }
            pruned.push(clean);
            continue;
        }

        let mut clean = json!({
            "role": role,
            "content": m.get("content").cloned().unwrap_or(json!(""))
        });
        if let Some(v) = m.get("displayContent") {
            clean["displayContent"] = v.clone();
        }
        if let Some(v) = m.get("attachments") {
            clean["attachments"] = v.clone();
        }
        if let Some(v) = m.get("tool_calls") {
            clean["tool_calls"] = v.clone();
        }
        if let Some(v) = m.get("agentInfo") {
            clean["agentInfo"] = v.clone();
        }
        if let Some(v) = m.get("name") {
            clean["name"] = v.clone();
        }
        pruned.push(clean);
    }
    pruned
}

fn handle_rpc(msg: Value, conn: &Connection) -> Value {
    let req_id = msg.get("id").cloned().unwrap_or(json!(null));
    let action = msg.get("action").and_then(|v| v.as_str()).unwrap_or("");

    let mut response = match action {
        "ping" => json!({
            "status": "ok",
            "message": "Rust Native Host Online",
            "version": "2.150.116",
            "runtime": "Rust 1.98 (Zero-GC, Native Binary)",
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "platform": std::env::consts::OS,
            "db_path": get_db_path().to_string_lossy(),
            "cwd": std::env::current_dir().unwrap_or_default().to_string_lossy()
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
                .map(expand_path)
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
            let args = msg.get("args").and_then(|v| v.as_str()).unwrap_or("");
            if app.is_empty() {
                json!({ "status": "error", "error": "No application specified" })
            } else {
                let full_cmd = if args.is_empty() { app.to_string() } else { format!("{} {}", app, args) };
                if cfg!(windows) {
                    let _ = Command::new("cmd").args(["/C", "start", "", &full_cmd]).spawn();
                } else {
                    let _ = Command::new("bash").args(["-c", &format!("{} &", full_cmd)]).spawn();
                }
                json!({ "status": "ok", "message": format!("Application '{}' launched", app) })
            }
        }

        // ==========================================
        // FILE & LOCAL DISK RPC HANDLERS
        // ==========================================
        "read_file" => {
            let raw_path = msg.get("path").and_then(|v| v.as_str()).unwrap_or("");
            if raw_path.is_empty() {
                json!({ "status": "error", "error": "No file path provided" })
            } else {
                let p = expand_path(raw_path);
                match fs::read_to_string(&p) {
                    Ok(content) => json!({
                        "status": "ok",
                        "content": content,
                        "path": p.to_string_lossy(),
                        "size": content.len()
                    }),
                    Err(e) => json!({ "status": "error", "error": format!("Read error: {}", e) }),
                }
            }
        }

        "write_file" => {
            let raw_path = msg.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let is_base64 = msg.get("is_base64").and_then(|v| v.as_bool()).unwrap_or(false);
            if raw_path.is_empty() {
                json!({ "status": "error", "error": "No file path provided" })
            } else {
                let p = expand_path(raw_path);
                if let Some(parent) = p.parent() {
                    let _ = fs::create_dir_all(parent);
                }

                if is_base64 {
                    let mut b64_str = msg.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    if let Some(comma_pos) = b64_str.find(',') {
                        b64_str = b64_str[comma_pos + 1..].to_string();
                    }
                    match BASE64_STANDARD.decode(b64_str.trim()) {
                        Ok(bytes) => match fs::write(&p, &bytes) {
                            Ok(_) => json!({ "status": "ok", "path": p.to_string_lossy(), "bytes_written": bytes.len() }),
                            Err(e) => json!({ "status": "error", "error": e.to_string() }),
                        },
                        Err(e) => json!({ "status": "error", "error": format!("Base64 decode error: {}", e) }),
                    }
                } else {
                    let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    match fs::write(&p, content) {
                        Ok(_) => json!({ "status": "ok", "path": p.to_string_lossy(), "bytes_written": content.len() }),
                        Err(e) => json!({ "status": "error", "error": e.to_string() }),
                    }
                }
            }
        }

        "read_file_binary" => {
            let raw_path = msg.get("path").and_then(|v| v.as_str()).unwrap_or("");
            if raw_path.is_empty() {
                json!({ "status": "error", "error": "No file path provided" })
            } else {
                let p = expand_path(raw_path);
                match fs::read(&p) {
                    Ok(bytes) => {
                        let b64 = BASE64_STANDARD.encode(&bytes);
                        let file_name = p.file_name().and_then(|s| s.to_str()).unwrap_or("file");
                        json!({
                            "status": "ok",
                            "file_name": file_name,
                            "file_size": bytes.len(),
                            "base64": b64,
                            "path": p.to_string_lossy()
                        })
                    }
                    Err(e) => json!({ "status": "error", "error": format!("Read binary error: {}", e) }),
                }
            }
        }

        "list_dir" => {
            let raw_path = msg.get("path").and_then(|v| v.as_str()).unwrap_or(".");
            let p = expand_path(raw_path);
            match fs::read_dir(&p) {
                Ok(entries) => {
                    let mut items = vec![];
                    for entry in entries.flatten() {
                        let ep = entry.path();
                        let is_dir = ep.is_dir();
                        let name = ep.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        items.push(json!({
                            "name": name,
                            "path": ep.to_string_lossy(),
                            "is_dir": is_dir,
                            "size": size
                        }));
                    }
                    json!({ "status": "ok", "path": p.to_string_lossy(), "items": items })
                }
                Err(e) => json!({ "status": "error", "error": format!("List dir error: {}", e) }),
            }
        }

        "open_file" => {
            let raw_path = msg.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let p = expand_path(raw_path);
            if cfg!(windows) {
                let _ = Command::new("cmd").args(["/C", "start", "", &p.to_string_lossy()]).spawn();
            } else if cfg!(target_os = "macos") {
                let _ = Command::new("open").arg(&p).spawn();
            } else {
                let _ = Command::new("xdg-open").arg(&p).spawn();
            }
            json!({ "status": "ok", "path": p.to_string_lossy() })
        }

        "reveal_file" => {
            let raw_path = msg.get("path").and_then(|v| v.as_str()).unwrap_or("");
            let p = expand_path(raw_path);
            let parent = p.parent().unwrap_or(&p);
            if cfg!(windows) {
                let _ = Command::new("explorer").args(["/select,", &p.to_string_lossy()]).spawn();
            } else if cfg!(target_os = "macos") {
                let _ = Command::new("open").args(["-R", &p.to_string_lossy()]).spawn();
            } else {
                let _ = Command::new("xdg-open").arg(parent).spawn();
            }
            json!({ "status": "ok", "path": p.to_string_lossy() })
        }

        "save_screenshot" => {
            let mut data = msg.get("image_data").or_else(|| msg.get("data")).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let sid = msg.get("screenshot_id").and_then(|v| v.as_str())
                .unwrap_or(&format!("shot_{}", now_millis()))
                .to_string();
            if let Some(comma_pos) = data.find(',') {
                data = data[comma_pos + 1..].to_string();
            }
            let target_path = get_db_dir().join("walkthrough_screenshots").join(format!("{}.png", sid));
            match BASE64_STANDARD.decode(data.trim()) {
                Ok(bytes) => match fs::write(&target_path, &bytes) {
                    Ok(_) => json!({ "status": "ok", "screenshot_id": sid, "path": target_path.to_string_lossy() }),
                    Err(e) => json!({ "status": "error", "error": e.to_string() }),
                },
                Err(e) => json!({ "status": "error", "error": format!("Base64 decode error: {}", e) }),
            }
        }

        "save_generated_image" => {
            let mut data = msg.get("image_data").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let img_id = msg.get("image_id").and_then(|v| v.as_str())
                .unwrap_or(&format!("img_{}", now_millis()))
                .to_string();
            if let Some(comma_pos) = data.find(',') {
                data = data[comma_pos + 1..].to_string();
            }
            let target_path = get_db_dir().join("generated_images").join(format!("{}.png", img_id));
            match BASE64_STANDARD.decode(data.trim()) {
                Ok(bytes) => match fs::write(&target_path, &bytes) {
                    Ok(_) => json!({ "status": "ok", "image_id": img_id, "path": target_path.to_string_lossy() }),
                    Err(e) => json!({ "status": "error", "error": e.to_string() }),
                },
                Err(e) => json!({ "status": "error", "error": format!("Base64 decode error: {}", e) }),
            }
        }

        "get_generated_image" => {
            let img_id = msg.get("image_id").and_then(|v| v.as_str()).unwrap_or("");
            let p = get_db_dir().join("generated_images").join(format!("{}.png", img_id));
            if p.exists() {
                match fs::read(&p) {
                    Ok(bytes) => {
                        let b64 = BASE64_STANDARD.encode(&bytes);
                        json!({ "status": "ok", "image_id": img_id, "data_url": format!("data:image/png;base64,{}", b64) })
                    }
                    Err(e) => json!({ "status": "error", "error": e.to_string() }),
                }
            } else {
                json!({ "status": "error", "error": "Image not found" })
            }
        }

        "capture_os_screenshot" => {
            let tmp_path = if cfg!(windows) {
                let temp = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
                PathBuf::from(temp).join("browser_agent_os_screenshot.png")
            } else {
                PathBuf::from("/tmp/browser_agent_os_screenshot.png")
            };

            if tmp_path.exists() {
                let _ = fs::remove_file(&tmp_path);
            }

            let mut success = false;
            let tmp_path_str = tmp_path.to_string_lossy().to_string();

            #[cfg(target_os = "linux")]
            {
                let candidates: Vec<(&str, Vec<&str>)> = vec![
                    ("spectacle", vec!["-b", "-n", "-o", &tmp_path_str]),
                    ("grim", vec![&tmp_path_str]),
                    ("gnome-screenshot", vec!["-f", &tmp_path_str]),
                    ("scrot", vec![&tmp_path_str]),
                    ("maim", vec![&tmp_path_str]),
                    ("import", vec!["-window", "root", &tmp_path_str]),
                ];

                for (bin, args) in candidates {
                    if let Ok(status) = Command::new(bin).args(&args).status() {
                        if status.success() && tmp_path.exists() && fs::metadata(&tmp_path).map(|m| m.len() > 0).unwrap_or(false) {
                            success = true;
                            break;
                        }
                    }
                }

                // Fallback via python PIL if available
                if !success {
                    let py_script = format!(
                        "import PIL.ImageGrab; img=PIL.ImageGrab.grab(); img.save('{}', 'PNG')",
                        tmp_path_str
                    );
                    if let Ok(status) = Command::new("python3").args(["-c", &py_script]).status() {
                        if status.success() && tmp_path.exists() && fs::metadata(&tmp_path).map(|m| m.len() > 0).unwrap_or(false) {
                            success = true;
                        }
                    }
                }
            }

            #[cfg(target_os = "macos")]
            {
                if let Ok(status) = Command::new("screencapture").args(["-x", &tmp_path_str]).status() {
                    if status.success() && tmp_path.exists() && fs::metadata(&tmp_path).map(|m| m.len() > 0).unwrap_or(false) {
                        success = true;
                    }
                }
            }

            #[cfg(target_os = "windows")]
            {
                let ps_script = format!(
                    "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $bmp.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()",
                    tmp_path_str.replace('\\', "\\\\")
                );
                if let Ok(status) = Command::new("powershell").args(["-NoProfile", "-Command", &ps_script]).status() {
                    if status.success() && tmp_path.exists() && fs::metadata(&tmp_path).map(|m| m.len() > 0).unwrap_or(false) {
                        success = true;
                    }
                }
            }

            if success && tmp_path.exists() {
                match fs::read(&tmp_path) {
                    Ok(bytes) => {
                        let b64 = BASE64_STANDARD.encode(&bytes);
                        json!({
                            "status": "ok",
                            "data_url": format!("data:image/png;base64,{}", b64),
                            "file_path": tmp_path_str
                        })
                    }
                    Err(e) => json!({ "status": "error", "error": format!("Failed to read screenshot: {}", e) }),
                }
            } else {
                json!({ "status": "error", "error": "Gagal mengambil screenshot desktop OS (CLI screenshot tool tidak tersedia)" })
            }
        }

        // ==========================================
        // SESSIONS RPC HANDLERS
        // ==========================================
        "db_save_session" => {
            let session_obj = msg.get("session").cloned().unwrap_or(json!({}));
            let mut sid = session_obj.get("id").and_then(|v| v.as_str())
                .or_else(|| msg.get("session_id").and_then(|v| v.as_str()))
                .unwrap_or("")
                .trim()
                .to_string();
            let now = now_millis();
            if sid.is_empty() {
                sid = format!("sess_{}", now);
            }
            let title = session_obj.get("title").and_then(|v| v.as_str())
                .or_else(|| msg.get("title").and_then(|v| v.as_str()))
                .unwrap_or("Percakapan Baru");
            let model = session_obj.get("model").and_then(|v| v.as_str())
                .or_else(|| msg.get("model").and_then(|v| v.as_str()))
                .unwrap_or("");

            let messages = if let Some(m) = session_obj.get("messages") {
                serde_json::to_string(m).unwrap_or_else(|_| "[]".to_string())
            } else {
                session_obj.get("messages_json").and_then(|v| v.as_str())
                    .or_else(|| msg.get("messages_json").and_then(|v| v.as_str()))
                    .unwrap_or("[]")
                    .to_string()
            };

            let parsed_msgs: Vec<Value> = serde_json::from_str(&messages).unwrap_or_default();
            let mut count = session_obj.get("message_count").and_then(|v| v.as_i64())
                .or_else(|| msg.get("message_count").and_then(|v| v.as_i64()))
                .unwrap_or(0);
            if count == 0 && !parsed_msgs.is_empty() {
                count = parsed_msgs.len() as i64;
            }

            let mut preview = session_obj.get("preview").and_then(|v| v.as_str())
                .or_else(|| msg.get("preview").and_then(|v| v.as_str()))
                .unwrap_or("")
                .trim()
                .to_string();
            if preview.is_empty() && !parsed_msgs.is_empty() {
                for m in &parsed_msgs {
                    let role = m.get("role").and_then(|v| v.as_str()).unwrap_or("");
                    if role == "user" {
                        if let Some(c) = m.get("content").and_then(|v| v.as_str()) {
                            let trimmed = c.trim();
                            if !trimmed.is_empty() {
                                preview = trimmed.chars().take(150).collect();
                                break;
                            }
                        } else if let Some(arr) = m.get("content").and_then(|v| v.as_array()) {
                            for item in arr {
                                if let Some(txt) = item.get("text").and_then(|v| v.as_str()) {
                                    let trimmed = txt.trim();
                                    if !trimmed.is_empty() {
                                        preview = trimmed.chars().take(150).collect();
                                        break;
                                    }
                                }
                            }
                            if !preview.is_empty() { break; }
                        }
                    }
                }
                if preview.is_empty() {
                    if let Some(first) = parsed_msgs.first() {
                        if let Some(c) = first.get("content").and_then(|v| v.as_str()) {
                            preview = c.trim().chars().take(150).collect();
                        }
                    }
                }
            }

            let is_pinned = session_obj.get("is_pinned").and_then(|v| v.as_i64())
                .or_else(|| msg.get("is_pinned").and_then(|v| v.as_i64()))
                .unwrap_or(0);

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
            let _ = heal_sessions(&conn);
            let search = msg.get("search").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
            let mut list = vec![];
            if search.is_empty() {
                if let Ok(mut stmt) = conn.prepare("SELECT id, title, model, message_count, preview, is_pinned, created_at, updated_at FROM sessions WHERE id != '' AND id IS NOT NULL ORDER BY is_pinned DESC, updated_at DESC") {
                    if let Ok(iter) = stmt.query_map([], |r| {
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
                    }) {
                        list = iter.flatten().collect();
                    }
                }
            } else {
                let q = format!("%{}%", search);
                if let Ok(mut stmt) = conn.prepare("SELECT id, title, model, message_count, preview, is_pinned, created_at, updated_at FROM sessions WHERE id != '' AND id IS NOT NULL AND (LOWER(title) LIKE ?1 OR LOWER(preview) LIKE ?1) ORDER BY is_pinned DESC, updated_at DESC") {
                    if let Ok(iter) = stmt.query_map(params![q], |r| {
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
                    }) {
                        list = iter.flatten().collect();
                    }
                }
            }
            json!({ "status": "ok", "sessions": list })
        }

        "db_get_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str())
                .or_else(|| msg.get("id").and_then(|v| v.as_str()))
                .unwrap_or("");
            let mut stmt = conn.prepare("SELECT id, title, model, messages_json, is_pinned, created_at, updated_at FROM sessions WHERE id = ?1");
            match stmt {
                Ok(mut s) => {
                    let session = s.query_row(params![sid], |r| {
                        let msgs_str: String = r.get(3).unwrap_or_else(|_| "[]".to_string());
                        let raw_msgs: Vec<Value> = serde_json::from_str(&msgs_str).unwrap_or_default();
                        let pruned_msgs = prune_messages_for_rpc(&raw_msgs);
                        Ok(json!({
                            "id": r.get::<_, String>(0)?,
                            "title": r.get::<_, String>(1)?,
                            "model": r.get::<_, String>(2)?,
                            "messages": pruned_msgs,
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
            let sid = msg.get("session_id").and_then(|v| v.as_str())
                .or_else(|| msg.get("id").and_then(|v| v.as_str()))
                .unwrap_or("");
            let res = if sid.trim().is_empty() {
                conn.execute("DELETE FROM sessions WHERE id = '' OR id IS NULL", [])
            } else {
                conn.execute("DELETE FROM sessions WHERE id = ?1", params![sid])
            };
            match res {
                Ok(count) => json!({ "status": "ok", "session_id": sid, "deleted_count": count }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_clear_all" => {
            let res = conn.execute("DELETE FROM sessions", []);
            match res {
                Ok(count) => json!({ "status": "ok", "cleared_count": count }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_pin_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let pin = msg.get("is_pinned").and_then(|v| {
                if let Some(b) = v.as_bool() {
                    Some(if b { 1 } else { 0 })
                } else {
                    v.as_i64()
                }
            }).unwrap_or(0);
            let res = conn.execute("UPDATE sessions SET is_pinned = ?1 WHERE id = ?2", params![pin, sid]);
            match res {
                Ok(_) => json!({ "status": "ok", "session_id": sid }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_rename_session" => {
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let title = msg.get("title").and_then(|v| v.as_str()).unwrap_or("Percakapan Baru");
            let res = conn.execute("UPDATE sessions SET title = ?1 WHERE id = ?2", params![title, sid]);
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

        "db_save_all_settings" => {
            let settings_obj = msg.get("settings").cloned().unwrap_or(json!({}));
            let now = now_millis();
            if let Some(map) = settings_obj.as_object() {
                for (k, v) in map {
                    let val_str = serde_json::to_string(v).unwrap_or_else(|_| "{}".to_string());
                    let _ = conn.execute(
                        "INSERT INTO settings (key, value_json, updated_at) VALUES (?1, ?2, ?3)
                         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
                        params![k, val_str, now],
                    );
                }
            }
            json!({ "status": "ok", "message": "All settings saved" })
        }

        "db_save_models" => {
            let models_arr = msg.get("models").cloned().unwrap_or(json!([]));
            let val_str = serde_json::to_string(&models_arr).unwrap_or_else(|_| "[]".to_string());
            let now = now_millis();
            let _ = conn.execute(
                "INSERT INTO settings (key, value_json, updated_at) VALUES ('models', ?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
                params![val_str, now],
            );
            json!({ "status": "ok", "message": "Models saved" })
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
            let mut settings_map = serde_json::Map::new();
            if let Ok(mut s) = conn.prepare("SELECT key, value_json FROM settings") {
                if let Ok(iter) = s.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))) {
                    for pair in iter.flatten() {
                        if let Ok(v) = serde_json::from_str::<Value>(&pair.1) {
                            settings_map.insert(pair.0, v);
                        } else {
                            settings_map.insert(pair.0, json!(pair.1));
                        }
                    }
                }
            }
            json!({ "status": "ok", "settings": settings_map })
        }

        // ==========================================
        // PERSISTENT MEMORY & BRAIN RPC HANDLERS
        // ==========================================
        "db_get_persistent_memory" => {
            let search = msg.get("search").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
            let has_search = !search.is_empty();
            let q = format!("%{}%", search);

            // 1. User Memories
            let mut user_memories = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, category, content, source, reason, confidence, created_at, updated_at FROM user_memories WHERE LOWER(content) LIKE ?1 OR LOWER(category) LIKE ?1 ORDER BY updated_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_user_memory) {
                        user_memories = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, category, content, source, reason, confidence, created_at, updated_at FROM user_memories ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], map_user_memory) {
                    user_memories = iter.flatten().collect();
                }
            }

            // 2. Experience Ledger
            let mut experience_ledger = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, session_id, title, distilled_markdown, key_learnings_json, tags, created_at FROM experience_ledger WHERE LOWER(title) LIKE ?1 OR LOWER(distilled_markdown) LIKE ?1 ORDER BY created_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_experience_ledger) {
                        experience_ledger = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, session_id, title, distilled_markdown, key_learnings_json, tags, created_at FROM experience_ledger ORDER BY created_at DESC") {
                if let Ok(iter) = s.query_map([], map_experience_ledger) {
                    experience_ledger = iter.flatten().collect();
                }
            }

            // 3. Anti Patterns
            let mut anti_patterns = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at FROM anti_patterns WHERE LOWER(target_domain) LIKE ?1 OR LOWER(mistake_description) LIKE ?1 OR LOWER(winning_fix) LIKE ?1 ORDER BY created_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_anti_pattern) {
                        anti_patterns = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at FROM anti_patterns ORDER BY created_at DESC") {
                if let Ok(iter) = s.query_map([], map_anti_pattern) {
                    anti_patterns = iter.flatten().collect();
                }
            }

            // 4. Autonomous Skills
            let mut autonomous_skills = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at FROM autonomous_skills WHERE LOWER(name) LIKE ?1 OR LOWER(description) LIKE ?1 OR LOWER(workflow_markdown) LIKE ?1 ORDER BY updated_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_autonomous_skill) {
                        autonomous_skills = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, name, description, workflow_markdown, version, source, success_count, failure_count, changelog, created_at, updated_at FROM autonomous_skills ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], map_autonomous_skill) {
                    autonomous_skills = iter.flatten().collect();
                }
            }

            // 5. Autonomous Agents
            let mut autonomous_agents = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at FROM autonomous_agents WHERE LOWER(name) LIKE ?1 OR LOWER(role_description) LIKE ?1 ORDER BY updated_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_autonomous_agent) {
                        autonomous_agents = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at FROM autonomous_agents ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], map_autonomous_agent) {
                    autonomous_agents = iter.flatten().collect();
                }
            }

            // 6. Chat Training Corpus
            let mut training_corpus = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, session_id, title, model, distilled_points_md, key_intents_json, tool_workflows_json, learnings_json, token_saved_estimate, created_at, updated_at FROM chat_training_corpus WHERE LOWER(title) LIKE ?1 OR LOWER(distilled_points_md) LIKE ?1 ORDER BY updated_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_training_corpus) {
                        training_corpus = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, session_id, title, model, distilled_points_md, key_intents_json, tool_workflows_json, learnings_json, token_saved_estimate, created_at, updated_at FROM chat_training_corpus ORDER BY updated_at DESC") {
                if let Ok(iter) = s.query_map([], map_training_corpus) {
                    training_corpus = iter.flatten().collect();
                }
            }

            // 7. Epistemic Triplets (Live Decayed Confidence)
            let mut epistemic_triplets = vec![];
            if has_search {
                if let Ok(mut s) = conn.prepare("SELECT id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at FROM graph_epistemic_triplets WHERE (LOWER(subject) LIKE ?1 OR LOWER(predicate) LIKE ?1 OR LOWER(object) LIKE ?1) AND status = 'active' ORDER BY negative_constraint ASC, updated_at DESC") {
                    if let Ok(iter) = s.query_map(params![q], map_epistemic_triplet) {
                        epistemic_triplets = iter.flatten().collect();
                    }
                }
            } else if let Ok(mut s) = conn.prepare("SELECT id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at FROM graph_epistemic_triplets WHERE status = 'active' ORDER BY negative_constraint ASC, updated_at DESC") {
                if let Ok(iter) = s.query_map([], map_epistemic_triplet) {
                    epistemic_triplets = iter.flatten().collect();
                }
            }

            let counts = json!({
                "user_memories": user_memories.len(),
                "experience_ledger": experience_ledger.len(),
                "anti_patterns": anti_patterns.len(),
                "autonomous_skills": autonomous_skills.len(),
                "autonomous_agents": autonomous_agents.len(),
                "training_corpus": training_corpus.len(),
                "epistemic_triplets": epistemic_triplets.len(),
                "total": user_memories.len() + experience_ledger.len() + anti_patterns.len() + autonomous_skills.len() + autonomous_agents.len() + training_corpus.len()
            });

            let total_count = user_memories.len() + experience_ledger.len() + anti_patterns.len() + autonomous_skills.len() + autonomous_agents.len() + training_corpus.len();

            json!({
                "status": "ok",
                "user_memories": user_memories,
                "experience_ledger": experience_ledger,
                "anti_patterns": anti_patterns,
                "autonomous_skills": autonomous_skills,
                "autonomous_agents": autonomous_agents,
                "training_corpus": training_corpus,
                "epistemic_triplets": epistemic_triplets,
                "counts": counts,
                "count": total_count
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

        "db_save_experience_distillation" => {
            let id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let sid = msg.get("session_id").and_then(|v| v.as_str()).unwrap_or("");
            let title = msg.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let md = msg.get("distilled_markdown").and_then(|v| v.as_str()).unwrap_or("");
            let kl = msg.get("key_learnings_json").and_then(|v| v.as_str()).unwrap_or("[]");
            let tags = msg.get("tags").and_then(|v| v.as_str()).unwrap_or("");
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO experience_ledger (id, session_id, title, distilled_markdown, key_learnings_json, tags, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET title = excluded.title, distilled_markdown = excluded.distilled_markdown, key_learnings_json = excluded.key_learnings_json, tags = excluded.tags",
                params![id, sid, title, md, kl, tags, now],
            );
            match res {
                Ok(_) => json!({ "status": "ok", "id": id }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_save_anti_pattern" => {
            let id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let domain = msg.get("target_domain").and_then(|v| v.as_str()).unwrap_or("");
            let mistake = msg.get("mistake_description").and_then(|v| v.as_str()).unwrap_or("");
            let root = msg.get("root_cause").and_then(|v| v.as_str()).unwrap_or("");
            let fix = msg.get("winning_fix").and_then(|v| v.as_str()).unwrap_or("");
            let rule = msg.get("prevention_rule").and_then(|v| v.as_str()).unwrap_or("");
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO anti_patterns (id, target_domain, mistake_description, root_cause, winning_fix, prevention_rule, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET target_domain = excluded.target_domain, mistake_description = excluded.mistake_description, root_cause = excluded.root_cause, winning_fix = excluded.winning_fix, prevention_rule = excluded.prevention_rule",
                params![id, domain, mistake, root, fix, rule, now],
            );
            match res {
                Ok(_) => json!({ "status": "ok", "id": id }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_save_autonomous_skill" => {
            let id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let name = msg.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let desc = msg.get("description").and_then(|v| v.as_str()).unwrap_or("");
            let md = msg.get("workflow_markdown").and_then(|v| v.as_str()).unwrap_or("");
            let ver = msg.get("version").and_then(|v| v.as_str()).unwrap_or("v1.0.0");
            let src = msg.get("source").and_then(|v| v.as_str()).unwrap_or("autonomous_ai");
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO autonomous_skills (id, name, description, workflow_markdown, version, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
                 ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, workflow_markdown = excluded.workflow_markdown, version = excluded.version, updated_at = excluded.updated_at",
                params![id, name, desc, md, ver, src, now],
            );
            match res {
                Ok(_) => json!({ "status": "ok", "id": id }),
                Err(e) => json!({ "status": "error", "error": e.to_string() }),
            }
        }

        "db_save_autonomous_agent" => {
            let id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let name = msg.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let desc = msg.get("role_description").and_then(|v| v.as_str()).unwrap_or("");
            let prompt = msg.get("system_prompt").and_then(|v| v.as_str()).unwrap_or("");
            let skills = msg.get("assigned_skills_json").and_then(|v| v.as_str()).unwrap_or("[]");
            let src = msg.get("source").and_then(|v| v.as_str()).unwrap_or("autonomous_ai");
            let reason = msg.get("reason").and_then(|v| v.as_str()).unwrap_or("");
            let now = now_millis();

            let res = conn.execute(
                "INSERT INTO autonomous_agents (id, name, role_description, system_prompt, assigned_skills_json, source, reason, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
                 ON CONFLICT(id) DO UPDATE SET name = excluded.name, role_description = excluded.role_description, system_prompt = excluded.system_prompt, assigned_skills_json = excluded.assigned_skills_json, updated_at = excluded.updated_at",
                params![id, name, desc, prompt, skills, src, reason, now],
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
                "user_profile" | "user_memories" | "memory" => "user_memories",
                "experience_ledger" | "experiences" => "experience_ledger",
                "anti_patterns" | "antipatterns" => "anti_patterns",
                "autonomous_skills" | "skills" => "autonomous_skills",
                "autonomous_agents" | "agents" => "autonomous_agents",
                "chat_training_corpus" | "training" => "chat_training_corpus",
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
            let mut triplets = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at FROM graph_epistemic_triplets WHERE status = 'active' ORDER BY negative_constraint ASC, updated_at DESC") {
                if let Ok(iter) = s.query_map([], map_epistemic_triplet) {
                    triplets = iter.flatten().collect();
                }
            }
            json!({ "status": "ok", "triplets": triplets })
        }

        "db_traverse_knowledge_graph" => {
            let entity = msg.get("entity").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let q = format!("%{}%", entity);
            let mut triplets = vec![];
            if let Ok(mut s) = conn.prepare("SELECT id, subject, predicate, object, confidence, decay_tau, source_kappa, negative_constraint, status, created_at, updated_at FROM graph_epistemic_triplets WHERE (LOWER(subject) LIKE ?1 OR LOWER(object) LIKE ?1) AND status = 'active' ORDER BY confidence DESC") {
                if let Ok(iter) = s.query_map(params![q], map_epistemic_triplet) {
                    triplets = iter.flatten().collect();
                }
            }
            json!({ "status": "ok", "entity": entity, "triplets": triplets })
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
                            let file_stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                            let cur_id = meta.get("id").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            if cur_id.is_empty() {
                                meta["id"] = json!(file_stem);
                            }
                            let cur_name = meta.get("name").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            if cur_name.is_empty() {
                                meta["name"] = json!(file_stem);
                            }
                            meta["content"] = json!(content);
                            meta["file_path"] = json!(p.to_string_lossy());
                            items.push(meta);
                        }
                    }
                }
            }
            json!({ "status": "ok", "items": items })
        }

        "save_skill" => {
            let skill_obj = msg.get("skill").cloned().unwrap_or(json!({}));
            let skills_dir = get_db_dir().join("skills");
            match save_md_item(&skills_dir, &skill_obj) {
                Ok(path) => json!({ "status": "ok", "file_path": path }),
                Err(e) => json!({ "status": "error", "error": e }),
            }
        }

        "delete_skill" => {
            let sid = msg.get("skill_id").and_then(|v| v.as_str()).unwrap_or("");
            let skills_dir = get_db_dir().join("skills");
            match delete_md_item(&skills_dir, sid) {
                Ok(_) => json!({ "status": "ok", "skill_id": sid }),
                Err(e) => json!({ "status": "error", "error": e }),
            }
        }

        "list_agents" => {
            let agents_dir = get_db_dir().join("agents");
            let mut items = vec![];
            if let Ok(entries) = fs::read_dir(agents_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) == Some("md") {
                        if let Some((mut meta, content)) = parse_md_file(&p) {
                            let file_stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                            let cur_id = meta.get("id").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            if cur_id.is_empty() {
                                meta["id"] = json!(file_stem);
                            }
                            let cur_name = meta.get("name").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            if cur_name.is_empty() {
                                meta["name"] = json!(file_stem);
                            }
                            meta["content"] = json!(content);
                            meta["file_path"] = json!(p.to_string_lossy());
                            items.push(meta);
                        }
                    }
                }
            }
            json!({ "status": "ok", "items": items })
        }

        "save_agent" => {
            let agent_obj = msg.get("agent").cloned().unwrap_or(json!({}));
            let agents_dir = get_db_dir().join("agents");
            match save_md_item(&agents_dir, &agent_obj) {
                Ok(path) => json!({ "status": "ok", "file_path": path }),
                Err(e) => json!({ "status": "error", "error": e }),
            }
        }

        "delete_agent" => {
            let aid = msg.get("agent_id").and_then(|v| v.as_str()).unwrap_or("");
            let agents_dir = get_db_dir().join("agents");
            match delete_md_item(&agents_dir, aid) {
                Ok(_) => json!({ "status": "ok", "agent_id": aid }),
                Err(e) => json!({ "status": "error", "error": e }),
            }
        }

        "list_memories" => {
            let mem_dir = get_db_dir().join("memories");
            let mut items = vec![];
            if let Ok(entries) = fs::read_dir(mem_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) == Some("md") {
                        if let Some((mut meta, content)) = parse_md_file(&p) {
                            let file_stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                            let cur_id = meta.get("id").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            if cur_id.is_empty() {
                                meta["id"] = json!(file_stem);
                            }
                            let cur_name = meta.get("name").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            if cur_name.is_empty() {
                                meta["name"] = json!(file_stem);
                            }
                            meta["content"] = json!(content);
                            meta["file_path"] = json!(p.to_string_lossy());
                            items.push(meta);
                        }
                    }
                }
            }
            json!({ "status": "ok", "items": items })
        }

        "save_memory" => {
            let mem_obj = msg.get("memory").cloned().unwrap_or(json!({}));
            let mem_dir = get_db_dir().join("memories");
            match save_md_item(&mem_dir, &mem_obj) {
                Ok(path) => json!({ "status": "ok", "file_path": path }),
                Err(e) => json!({ "status": "error", "error": e }),
            }
        }

        "delete_memory" => {
            let mid = msg.get("memory_id").and_then(|v| v.as_str()).unwrap_or("");
            let mem_dir = get_db_dir().join("memories");
            match delete_md_item(&mem_dir, mid) {
                Ok(_) => json!({ "status": "ok", "memory_id": mid }),
                Err(e) => json!({ "status": "error", "error": e }),
            }
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
    log_msg("  Browser Agent Rust Native Host v2.150.116 starting...");
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
