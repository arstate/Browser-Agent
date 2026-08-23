import json
import os
import sys

transcript_path = "/home/arya/.gemini/antigravity-cli/brain/7a60fcd3-8146-43e4-bc2a-fa745d9d5241/.system_generated/logs/transcript_full.jsonl"
if not os.path.exists(transcript_path):
    transcript_path = "/home/arya/.gemini/antigravity-cli/brain/7a60fcd3-8146-43e4-bc2a-fa745d9d5241/.system_generated/logs/transcript.jsonl"

out_md = "/home/arya/Downloads/PERCAKAPAN_LENGKAP_ANTIGRAVITY.md"

lines_out = []
lines_out.append("# 📜 RIWAYAT LENGKAP PERCAKAPAN & PENGEMBANGAN BROWSER AGENT")
lines_out.append("### Antigravity Pair-Programming Session ID: `7a60fcd3-8146-43e4-bc2a-fa745d9d5241`")
lines_out.append("### Tanggal Export: 23 Agustus 2026")
lines_out.append("---\n")

user_turn_count = 0
with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except Exception:
            continue

        step_type = data.get("type", "")
        source = data.get("source", "")
        content = data.get("content", "")
        created_at = data.get("created_at", "")

        if step_type == "USER_INPUT" or source == "USER_EXPLICIT":
            user_turn_count += 1
            lines_out.append(f"\n## 👤 User Prompt #{user_turn_count} ({created_at})\n")
            lines_out.append(f"```text\n{content}\n```\n")
        elif step_type == "PLANNER_RESPONSE" and content:
            lines_out.append(f"\n### 🤖 Antigravity AI Response\n")
            lines_out.append(content)
            lines_out.append("\n---\n")

with open(out_md, 'w', encoding='utf-8') as f:
    f.write("\n".join(lines_out))

print(f"Exported {user_turn_count} turns to {out_md} ({os.path.getsize(out_md)} bytes)")
