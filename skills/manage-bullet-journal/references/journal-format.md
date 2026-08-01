# Journal format

## Paths

Given journal root `<journal>`:

- Daily Log: `<journal>/Daily/YYYY-MM-DD.md`
- Monthly Log: `<journal>/Monthly/YYYY-MM.md`
- Future Log: `<journal>/Future/YYYY.md`, under `## YYYY-MM`
- Index: `<journal>/Index.md`

Use local calendar dates, not UTC dates. A new Daily Log starts with:

```markdown
# YYYY-MM-DD

```

A new Monthly Log needs at least:

```markdown
# YYYY-MM

## Tasks

```

Match an existing localized Tasks heading instead of adding another one.

## Bullet syntax

| Meaning | Markdown |
|---|---|
| Task | `• action` |
| Completed task | `× action` |
| Migrated task | `\> action` |
| Scheduled task | `< action` |
| Event | `○ event` |
| Note | `– information` |
| Priority | `* ` before the bullet |
| Inspiration | `! ` before the bullet |
| Explore | `? ` before the bullet |

Always store a migrated marker as `\>` so Markdown does not render it as a blockquote. Preserve a signifier when changing task state: `* • task` becomes `* × task`.

Indent subtasks and supporting notes by one tab:

```markdown
• Write weekly report
	• Gather completed work
	• Summarize blockers
	• Draft next week's plan
```

## Natural-language examples

“帮我把8月2日写周报的任务拆分一下” updates that date's Daily Log:

```markdown
• 写周报
	• 整理本周完成事项
	• 汇总关键数据和结果
	• 记录问题与阻塞
	• 列出下周计划
	• 校对并发送
```

“我今天看了《设计心理学》，意识到反馈应该即时可见” adds:

```markdown
○ 阅读《设计心理学》
! – 反馈应该即时可见
```

“下个月续费域名” adds `• 续费域名` to next month's Future Log. When moving an existing task there, mark its source as `<`.
