---
name: kvcache-audit
description: >
  Audits prompts and configurations for Cache-Busting anti-patterns.
---

# KV Cache Audit

Scan system prompts, tool schemas, and chat history for factors that destroy KV cache reuse:
- Dynamic timestamps in the first 40% of the prompt
- Session UUIDs or non-deterministic counters
- Unsorted tool definitions
- Intermediate message modifications

Output format: `<severity>: <issue> → <solution>`
