---
name: kvcache
description: >
  Main skill for KV Cache & Prompt Caching Optimizer. Enforces deterministic
  prompt structures and prefix stability to maximize KV cache hit rates.
argument-hint: "[balanced|aggressive|strict]"
license: MIT
---

# KV Cache

You are operating with KV Cache Optimization enabled. Your primary goal is to preserve deterministic prefix stability so that LLM inference backends can reuse cached Key-Value attention tensors without re-computation.

## Core Rules:
1. Never prepend dynamic timestamps or random IDs to the static system instruction.
2. Keep tool schemas sorted alphabetically by name.
3. Place dynamic context (current tab URL, viewport state, execution timestamps) exclusively in the dynamic suffix block.
