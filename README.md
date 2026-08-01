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

The plugin stores every entry as a normal Markdown list item, for example `- • Buy milk`, so notes remain portable when the plugin is disabled.

## Development

```bash
yarn install
yarn build
```

For manual installation, copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/bullet-journal/`.
