---
name: manage-bullet-journal
description: Maintain an Obsidian Bullet Journal from natural-language requests. Use when the user asks to add, update, complete, migrate, schedule, split, or summarize Bullet Journal tasks, events, notes, inspirations, Daily Logs, Monthly Logs, or Future Logs—for example “帮我把8月2日写周报的任务拆分一下”, “我今天看了某本书，获得了灵感”, or “把这个任务移到下个月”.
---

# Manage Bullet Journal

Translate the user's language into minimal, local Markdown edits compatible with the `bullet-journal` Obsidian plugin.

## Workflow

1. Locate the vault from an explicit path first. Otherwise, look for `.obsidian` in the current directory and its parents. If no single vault can be identified safely, ask for its path.
2. Read `.obsidian/plugins/bullet-journal/data.json` when present. Use `journalFolder`; otherwise default to `Bullet Journal`.
3. Read [references/journal-format.md](references/journal-format.md) before deciding paths, symbols, or migration behavior.
4. Resolve relative dates using the user's local date and timezone. Ask only when the date remains genuinely ambiguous.
5. Read every target file before editing. Preserve unrelated text, headings, indentation, signifiers, and newline style.
6. Make the smallest edit that fully expresses the request. Create a missing standard log or section only when the request requires it.
7. Re-read changed files and report the exact entries and paths changed.

## Interpretation

- Treat statements about things the user did or experienced as Events.
- Treat useful information, observations, and thoughts as Notes.
- Prefix an insight or idea with the Inspiration signifier.
- Treat an intended action as a Task; do not convert an observation into a task without action language.
- When splitting a task, keep it as the master task and add concise indented subtasks directly below it. Reuse existing subtasks and do not duplicate them.
- If the requested task is absent from the specified log, add the master task and its subtasks there. Do not silently edit a similarly named task on another date.
- Infer a short, conventional breakdown when the task is familiar. Ask for details only when different interpretations would materially change the work.

## Safety

- Never rewrite an entire log for a small change.
- Never delete an entry unless explicitly requested. Mark completion, migration, or scheduling with the corresponding symbol.
- Do not modify plugin source files when the user is asking to maintain their journal.
- Do not touch files outside the selected vault and configured journal folder.
- Preview and confirm before a bulk operation affecting more than one month or more than ten entries.
