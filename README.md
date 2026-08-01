# Bullet Journal

An Obsidian plugin for using Bullet Journal symbols in Markdown notes.

## Usage

Place the cursor on a line, or select several lines, then run **Bullet Journal: Cycle bullet symbol** from the command palette. Repeating the command cycles through:

- `•` task
- `×` completed task
- `>` migrated task
- `<` scheduled task
- `–` note
- `○` event

Write entries directly with Bullet Journal symbols, for example `• Buy milk`. Indentation creates nested lists in reading view.

Set **Bullet Journal folder** in the plugin settings, then run **Bullet Journal: Open today** to open or create `Daily/YYYY-MM-DD.md` inside it.

Use **Open current month** to create the current monthly log. Use **Migrate unfinished tasks** to select tasks from the latest earlier daily note; selected source tasks become `>` and are appended to today as `•`.

Select unfinished task lines and use **Migrate to date or month** to move them manually. Enter `YYYYMMDD` for a daily note or `YYYYMM` for a monthly note.

## Development

```bash
yarn install
yarn build
```

For manual installation, copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/bullet-journal/`.
