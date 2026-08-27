---
name: ponytail-debt
description: >
  Harvest ponytail shortcuts into a tracked ledger. Finds every `# ponytail:`
  / `// ponytail:` / `<!-- ponytail: -->` comment in the tree, parses what was
  simplified, the trigger to revisit, and lists them grouped by file with line
  numbers. Use when the user says "what did ponytail skip", "list ponytail
  debt", "show technical debt", "ponytail-debt", or "/ponytail-debt". Reads
  only, does not edit.
---

# Ponytail Debt

Ponytail leaves `# ponytail:` / `// ponytail:` / `/* ponytail: */` /
`<!-- ponytail: -->` comments at deliberate simplifications with a known
ceiling. This command harvests them into a ledger so "later" isn't lost.

## Format

Grouped by file, one line per marker:

`L<line>: <what was skipped> → upgrade when <trigger>`

Extract what was skipped and the trigger straight from the comment. Want an owner per row too? add `git blame -L<line>,<line>`.

Flag the rot risk: any `ponytail:` comment that names no upgrade path or trigger gets a `no-trigger` tag, those are the ones that silently rot.

End with `<N> markers, <M> with no trigger.` Nothing found: `No ponytail: debt. Clean ledger.`

## Boundaries

Reads and reports only, changes nothing. To persist it, ask and it writes the
ledger to a file (e.g. `PONYTAIL-DEBT.md`). One-shot. "stop ponytail-debt" or
"normal mode" to revert.
