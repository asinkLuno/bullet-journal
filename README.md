# Bullet Journal

An Obsidian plugin for using Bullet Journal symbols in Markdown notes.

## Usage

Place the cursor on a line, or select several lines, then run **Bullet Journal: Cycle bullet symbol** from the command palette. Repeating the command cycles through:

- `•` task
- `×` completed task
- `\>` migrated task (displayed as `>` without becoming a Markdown quote)
- `<` scheduled task
- `–` note
- `○` event

Run **Cycle signifier** to mark a task as `*` (priority), `!` (inspiration), or `?` (to explore); repeating removes the marker. Signifiers are highlighted in reading view.

Write entries directly with Bullet Journal symbols, for example `• Buy milk`. Indentation creates nested lists in reading view.

Set **Bullet Journal folder** in the plugin settings, then run **Bullet Journal: Open today** to open or create `Daily/YYYY-MM-DD.md` inside it.

Use **Open current month** to create the current monthly log with a calendar page and a tasks section. Use **Migrate unfinished tasks** to select tasks from the latest earlier daily note; selected source tasks become `>` and are appended to today as `•`.

Select unfinished task lines and use **Migrate to date or month** to move them manually. Enter `YYYYMMDD` for a daily note or `YYYYMM` for a monthly note.

Use **Migrate last month's unfinished tasks** at the end of the month: unfinished tasks are collected from last month's Monthly and Daily Logs. Selected tasks move into this month's tasks section, and the source lines become `>`.

Use **Migrate tasks from future log** to pull the current month's unfinished tasks into this month's monthly log, then mark the source tasks as migrated.

Use **Open future log** to open or create `Future/YYYY.md` with one section per month for the next six months. Select task lines and use **Move to future log** to schedule them in a future month; the source lines become `<` (scheduled) and the tasks are inserted under the chosen month's section.

Run **Update index** to generate `Index.md` inside the journal folder, linking all daily, monthly, and future log entries as wikilinks (Obsidian resolves them and shows backlinks). Including Daily Logs is an intentional digital adaptation of the original method. The index also refreshes automatically when entries are created, renamed, or deleted.

Use **Set up journal** to initialize the whole structure at once, in the order suggested by the Bullet Journal Method: Index → Future Log → Monthly Log → today's Daily Log.

## TODO

- **Custom bullets** — make the bullet and signifier symbols configurable in settings instead of hard-coded.
- Reflection prompts (daily/monthly) and gratitude template.
- Habit/mood tracker generation.
- Time Boxing rendering.

## Development

```bash
npm install
npm run build
```

For manual installation, copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/bullet-journal/`.
