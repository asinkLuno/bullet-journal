import { Editor, Modal, Notice, Plugin, Setting, TFile, TFolder, normalizePath } from 'obsidian';
import { formatLocalDate, formatLocalMonth, parseMigrationTarget } from './date';
import { DEFAULT_SETTINGS, BulletJournalSettings } from './settings';
import { UnfinishedTask, findUnfinishedTasks } from './tasks';
import { t } from './i18n';

interface JournalPlugin extends Plugin {
	settings: BulletJournalSettings;
}

function journalFolder(value: string): string {
	const folder = normalizePath(value || DEFAULT_SETTINGS.journalFolder);
	if (folder.split('/').some((part) => part === '..'))
		throw new Error(t('folderOutsideVault'));
	return folder;
}

async function ensureFolder(plugin: Plugin, path: string): Promise<void> {
	let current = '';
	for (const part of path.split('/')) {
		current = current ? `${current}/${part}` : part;
		const existing = plugin.app.vault.getAbstractFileByPath(current);
		if (!existing) await plugin.app.vault.createFolder(current);
		else if (!(existing instanceof TFolder))
			throw new Error(t('fileExists', { path: current }));
	}
}

async function getOrCreateFile(plugin: Plugin, path: string, content: string): Promise<TFile> {
	const existing = plugin.app.vault.getAbstractFileByPath(path);
	if (existing && !(existing instanceof TFile))
		throw new Error(t('folderExists', { path }));
	return existing ?? plugin.app.vault.create(path, content);
}

async function getTodayFile(plugin: JournalPlugin): Promise<TFile> {
	const date = formatLocalDate(new Date());
	const folder = `${journalFolder(plugin.settings.journalFolder)}/Daily`;
	await ensureFolder(plugin, folder);
	return getOrCreateFile(plugin, `${folder}/${date}.md`, `# ${date}\n\n`);
}

async function openToday(plugin: JournalPlugin): Promise<void> {
	await plugin.app.workspace.getLeaf(false).openFile(await getTodayFile(plugin));
}

async function openCurrentMonth(plugin: JournalPlugin): Promise<void> {
	const month = formatLocalMonth(new Date());
	const folder = `${journalFolder(plugin.settings.journalFolder)}/Monthly`;
	await ensureFolder(plugin, folder);
	const file = await getOrCreateFile(
		plugin,
		`${folder}/${month}.md`,
		`# ${month}\n\n## ${t('tasks')}\n\n`,
	);
	await plugin.app.workspace.getLeaf(false).openFile(file);
}

class MigrationModal extends Modal {
	private readonly selected = new Set<number>();

	constructor(
		plugin: JournalPlugin,
		private readonly tasks: UnfinishedTask[],
		private readonly migrate: (selected: Set<number>) => Promise<void>,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle(t('migrateUnfinished'));
		for (const task of this.tasks) {
			new Setting(this.contentEl)
				.setName(task.content.trimStart())
				.addToggle((toggle) => toggle.onChange((checked) => {
					if (checked) this.selected.add(task.line);
					else this.selected.delete(task.line);
				}));
		}
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText(t('cancel')).onClick(() => this.close()))
			.addButton((button) => button
				.setButtonText(t('migrate'))
				.setCta()
				.onClick(() => {
					void this.migrate(this.selected)
						.then(() => this.close())
						.catch((error: unknown) => {
							new Notice(error instanceof Error ? error.message : t('migrationFailed'));
						});
				}));
	}
}

class ManualMigrationModal extends Modal {
	constructor(
		plugin: JournalPlugin,
		private readonly submit: (target: string) => Promise<void>,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle(t('migrateToTarget'));
		let target = '';
		new Setting(this.contentEl)
			.setName(t('target'))
			.setDesc(t('targetDesc'))
			.addText((text) => text
				.setPlaceholder('20260731')
				.onChange((value) => { target = value.trim(); }));
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText(t('cancel')).onClick(() => this.close()))
			.addButton((button) => button
				.setButtonText(t('migrate'))
				.setCta()
				.onClick(() => {
					void this.submit(target)
						.then(() => this.close())
						.catch((error: unknown) => {
							new Notice(error instanceof Error ? error.message : t('migrationFailed'));
						});
				}));
	}
}

async function migrateUnfinished(plugin: JournalPlugin): Promise<void> {
	const today = formatLocalDate(new Date());
	const folder = `${journalFolder(plugin.settings.journalFolder)}/Daily`;
	const previous = plugin.app.vault.getMarkdownFiles()
		.filter((file) => file.parent?.path === folder && file.basename < today)
		.sort((a, b) => b.basename.localeCompare(a.basename))[0];
	if (!previous) throw new Error(t('noPreviousDaily'));

	const source = await plugin.app.vault.read(previous);
	const tasks = findUnfinishedTasks(source);
	if (!tasks.length) throw new Error(t('noTasks'));

	new MigrationModal(plugin, tasks, async (selected) => {
		if (!selected.size) return;
		const current = await plugin.app.vault.read(previous);
		const lines = current.split('\n');
		const migrated: string[] = [];
		for (const task of tasks.filter((item) => selected.has(item.line))) {
			if (lines[task.line] !== task.text) continue;
			lines[task.line] = task.text.replace('•', '>');
			migrated.push(task.content);
		}
		if (!migrated.length) throw new Error(t('selectedTasksChanged'));
		await plugin.app.vault.append(await getTodayFile(plugin), `${migrated.join('\n')}\n`);
		await plugin.app.vault.modify(previous, lines.join('\n'));
		new Notice(t('migrated', { count: migrated.length }));
	}).open();
}

function migrateManually(plugin: JournalPlugin, editor: Editor): void {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const lines = Array.from(
		{ length: to.line - from.line + 1 },
		(_, offset) => editor.getLine(from.line + offset),
	);
	const tasks = lines.filter((line) => /^\s*•\s+.+$/u.test(line));
	if (!tasks.length) {
		new Notice(t('selectTask'));
		return;
	}

	new ManualMigrationModal(plugin, async (input) => {
		const target = parseMigrationTarget(input);
		if (!target) throw new Error(t('validTarget'));
		const root = journalFolder(plugin.settings.journalFolder);
		const folder = `${root}/${target.kind === 'daily' ? 'Daily' : 'Monthly'}`;
		await ensureFolder(plugin, folder);
		const path = `${folder}/${target.value}.md`;
		const heading = target.kind === 'daily'
			? `# ${target.value}\n\n`
			: `# ${target.value}\n\n## ${t('tasks')}\n\n`;
		await plugin.app.vault.append(
			await getOrCreateFile(plugin, path, heading),
			`${tasks.join('\n')}\n`,
		);
		editor.replaceRange(
			lines.map((line) => line.replace(/^(\s*)•/u, '$1>')).join('\n'),
			{ line: from.line, ch: 0 },
			{ line: to.line, ch: editor.getLine(to.line).length },
		);
		new Notice(t('migrated', { count: tasks.length }));
	}).open();
}

function run(action: () => Promise<void>): void {
	void action().catch((error: unknown) => {
		new Notice(error instanceof Error ? error.message : t('commandFailed'));
	});
}

export function registerJournalCommands(plugin: JournalPlugin): void {
	plugin.addCommand({ id: 'open-today', name: t('openToday'), callback: () => run(() => openToday(plugin)) });
	plugin.addCommand({ id: 'open-current-month', name: t('openCurrentMonth'), callback: () => run(() => openCurrentMonth(plugin)) });
	plugin.addCommand({ id: 'migrate-unfinished', name: t('migrateUnfinished'), callback: () => run(() => migrateUnfinished(plugin)) });
	plugin.addCommand({ id: 'migrate-to-date-or-month', name: t('migrateToTarget'), editorCallback: (editor) => migrateManually(plugin, editor) });
}
