import { Editor, Notice, Plugin, TFile, TFolder, debounce, normalizePath } from 'obsidian';
import { formatLocalDate, formatLocalMonth, parseMigrationTarget } from './date';
import { FutureMonth, appendToSection, futureMonths } from './future';
import { WEEKDAYS_EN, WEEKDAYS_ZH, monthCalendar } from './calendar';
import { DEFAULT_SETTINGS, BulletJournalSettings } from './settings';
import { findUnfinishedTasks, isUnfinishedTask, markTask } from './tasks';
import { isChineseLocale, t } from './i18n';
import { FutureMonthModal, ManualMigrationModal, MigrationModal } from './migration-modal';

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

function tasksHeading(content: string): string {
	for (const heading of ['## Tasks', '## 任务']) {
		if (content.split('\n').includes(heading)) return heading;
	}
	return `## ${t('tasks')}`;
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

async function ensureCurrentMonth(plugin: JournalPlugin): Promise<TFile> {
	const now = new Date();
	const month = formatLocalMonth(now);
	const folder = `${journalFolder(plugin.settings.journalFolder)}/Monthly`;
	await ensureFolder(plugin, folder);
	return getOrCreateFile(
		plugin,
		`${folder}/${month}.md`,
		`# ${month}\n\n## ${t('calendar')}\n\n${monthCalendar(
			now.getFullYear(),
			now.getMonth() + 1,
			isChineseLocale() ? WEEKDAYS_ZH : WEEKDAYS_EN,
		)}\n\n## ${t('tasks')}\n\n`,
	);
}

async function openCurrentMonth(plugin: JournalPlugin): Promise<void> {
	await plugin.app.workspace.getLeaf(false).openFile(await ensureCurrentMonth(plugin));
}

async function ensureFutureLog(plugin: JournalPlugin): Promise<TFile | null> {
	const months = futureMonths(new Date());
	const folder = `${journalFolder(plugin.settings.journalFolder)}/Future`;
	await ensureFolder(plugin, folder);
	const byYear = new Map<number, FutureMonth[]>();
	for (const month of months) {
		byYear.set(month.year, [...(byYear.get(month.year) ?? []), month]);
	}
	let primary: TFile | null = null;
	for (const [year, yearMonths] of byYear) {
		const file = await getOrCreateFile(plugin, `${folder}/${year}.md`, `# ${t('futureLog')}\n\n`);
		let content = await plugin.app.vault.read(file);
		let changed = false;
		for (const month of yearMonths) {
			if (content.split('\n').includes(`## ${month.value}`)) continue;
			content = appendToSection(content, `## ${month.value}`, '');
			changed = true;
		}
		if (changed) await plugin.app.vault.modify(file, content);
		if (year === months[0]?.year) primary = file;
	}
	return primary;
}

async function openFutureLog(plugin: JournalPlugin): Promise<void> {
	const primary = await ensureFutureLog(plugin);
	if (primary) await plugin.app.workspace.getLeaf(false).openFile(primary);
}

async function setupJournal(plugin: JournalPlugin): Promise<void> {
	await ensureFutureLog(plugin);
	await ensureCurrentMonth(plugin);
	await getTodayFile(plugin);
	await refreshIndex(plugin);
	new Notice(t('journalReady'));
}

function moveToFutureLog(plugin: JournalPlugin, editor: Editor): void {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const lines = Array.from(
		{ length: to.line - from.line + 1 },
		(_, offset) => editor.getLine(from.line + offset),
	);
	const tasks = lines.filter(isUnfinishedTask);
	if (!tasks.length) {
		new Notice(t('selectTask'));
		return;
	}

	new FutureMonthModal(plugin, futureMonths(new Date()), async (month) => {
		const root = journalFolder(plugin.settings.journalFolder);
		const folder = `${root}/Future`;
		await ensureFolder(plugin, folder);
		const path = `${folder}/${month.year}.md`;
		const file = await getOrCreateFile(plugin, path, `# ${t('futureLog')}\n\n`);
		const content = appendToSection(
			await plugin.app.vault.read(file),
			`## ${month.value}`,
			tasks.join('\n'),
		);
		await plugin.app.vault.modify(file, content);
		editor.replaceRange(
			lines.map((line) => markTask(line, '<')).join('\n'),
			{ line: from.line, ch: 0 },
			{ line: to.line, ch: editor.getLine(to.line).length },
		);
		new Notice(t('migrated', { count: tasks.length }));
	}).open();
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
		for (const task of tasks.filter((_, index) => selected.has(index))) {
			if (lines[task.line] !== task.text) continue;
			lines[task.line] = markTask(task.text, '>');
			migrated.push(task.content);
		}
		if (!migrated.length) throw new Error(t('selectedTasksChanged'));
		await plugin.app.vault.append(await getTodayFile(plugin), `${migrated.join('\n')}\n`);
		await plugin.app.vault.modify(previous, lines.join('\n'));
		new Notice(t('migrated', { count: migrated.length }));
	}).open();
}

async function migrateMonthlyUnfinished(plugin: JournalPlugin): Promise<void> {
	const now = new Date();
	const month = formatLocalMonth(now);
	const previousMonth = formatLocalMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
	const root = journalFolder(plugin.settings.journalFolder);
	const folder = `${root}/Monthly`;
	const sources = plugin.app.vault.getMarkdownFiles().filter((file) =>
		(file.parent?.path === folder && file.basename === previousMonth)
		|| (file.parent?.path === `${root}/Daily` && file.basename.startsWith(`${previousMonth}-`)),
	);
	if (!sources.length) throw new Error(t('noPreviousMonthly'));

	const candidates = (await Promise.all(sources.map(async (file) =>
		findUnfinishedTasks(await plugin.app.vault.read(file)).map((task) => ({ file, task })),
	))).flat();
	if (!candidates.length) throw new Error(t('noTasks'));

	new MigrationModal(plugin, candidates.map(({ file, task }) => ({
		content: `${file.basename}: ${task.content.trimStart()}`,
	})), async (selected) => {
		if (!selected.size) return;
		const changes = new Map<TFile, string[]>();
		const migrated: string[] = [];
		for (const { file, task } of candidates.filter((_, index) => selected.has(index))) {
			const lines = changes.get(file) ?? (await plugin.app.vault.read(file)).split('\n');
			if (lines[task.line] !== task.text) continue;
			lines[task.line] = markTask(task.text, '>');
			migrated.push(task.content);
			changes.set(file, lines);
		}
		if (!migrated.length) throw new Error(t('selectedTasksChanged'));
		await ensureFolder(plugin, folder);
		const file = await getOrCreateFile(
			plugin,
			`${folder}/${month}.md`,
			`# ${month}\n\n## ${t('tasks')}\n\n`,
		);
		const content = await plugin.app.vault.read(file);
		await plugin.app.vault.modify(file, appendToSection(content, tasksHeading(content), migrated.join('\n')));
		for (const [source, lines] of changes)
			await plugin.app.vault.modify(source, lines.join('\n'));
		new Notice(t('migrated', { count: migrated.length }));
	}).open();
}

async function migrateFromFutureLog(plugin: JournalPlugin): Promise<void> {
	const now = new Date();
	const month = formatLocalMonth(now);
	const root = journalFolder(plugin.settings.journalFolder);
	const folder = plugin.app.vault.getAbstractFileByPath(`${root}/Future`);
	if (!(folder instanceof TFolder)) throw new Error(t('noFutureLog'));

	const monthHeading = `## ${month}`;
	let source: TFile | null = null;
	let lines: string[] = [];
	for (const candidate of folder.children.filter((child): child is TFile => child instanceof TFile)) {
		const candidateLines = (await plugin.app.vault.read(candidate)).split('\n');
		if (candidateLines.includes(monthHeading)) {
			source = candidate;
			lines = candidateLines;
			break;
		}
	}
	if (!source) throw new Error(t('noFutureTasks'));

	const start = lines.findIndex((line) => line === monthHeading);
	let end = start + 1;
	while (end < lines.length && !/^##\s/u.test(lines[end] ?? '')) end++;
	const tasks = findUnfinishedTasks(lines.slice(start + 1, end).join('\n'));
	if (!tasks.length) throw new Error(t('noFutureTasks'));

	await ensureFolder(plugin, `${root}/Monthly`);
	const monthly = await getOrCreateFile(
		plugin,
		`${root}/Monthly/${month}.md`,
		`# ${month}\n\n## ${t('tasks')}\n\n`,
	);
	const content = await plugin.app.vault.read(monthly);
	await plugin.app.vault.modify(
		monthly,
		appendToSection(content, tasksHeading(content), tasks.map((task) => task.content).join('\n')),
	);
	for (const task of tasks)
		lines[start + 1 + task.line] = markTask(task.text, '>');
	await plugin.app.vault.modify(source, lines.join('\n'));
	new Notice(t('migratedFromFuture', { count: tasks.length, month }));
}

async function buildIndex(plugin: JournalPlugin): Promise<string | null> {
	const root = journalFolder(plugin.settings.journalFolder);
	const sections: [string, string[]][] = [];
	for (const [sub, heading] of [['Daily', t('daily')], ['Monthly', t('monthly')], ['Future', t('futureLog')]] as const) {
		const files = plugin.app.vault.getMarkdownFiles()
			.filter((file) => file.parent?.path === `${root}/${sub}`)
			.map((file) => file.basename)
			.sort((a, b) => a.localeCompare(b));
		if (files.length) sections.push([heading, files]);
	}
	if (!sections.length) return null;
	return `# ${t('index')}\n\n${sections
		.map(([heading, files]) => `## ${heading}\n\n${files.map((file) => `- [[${file}]]`).join('\n')}\n`)
		.join('\n')}`;
}

async function writeIndex(plugin: JournalPlugin, content: string): Promise<TFile> {
	const path = `${journalFolder(plugin.settings.journalFolder)}/Index.md`;
	const existing = plugin.app.vault.getAbstractFileByPath(path);
	if (existing && !(existing instanceof TFile)) throw new Error(t('fileExists', { path }));
	const file = existing ?? await plugin.app.vault.create(path, content);
	if (existing && (await plugin.app.vault.read(file)) !== content)
		await plugin.app.vault.modify(file, content);
	return file;
}

async function refreshIndex(plugin: JournalPlugin): Promise<void> {
	const content = await buildIndex(plugin);
	if (content !== null) await writeIndex(plugin, content);
}

async function updateIndex(plugin: JournalPlugin): Promise<void> {
	const content = await buildIndex(plugin);
	if (content === null) throw new Error(t('noJournalEntries'));
	await plugin.app.workspace.getLeaf(false).openFile(await writeIndex(plugin, content));
}

function migrateManually(plugin: JournalPlugin, editor: Editor): void {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const lines = Array.from(
		{ length: to.line - from.line + 1 },
		(_, offset) => editor.getLine(from.line + offset),
	);
	const tasks = lines.filter(isUnfinishedTask);
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
		const file = await getOrCreateFile(plugin, path, heading);
		const content = await plugin.app.vault.read(file);
		if (target.kind === 'daily') {
			await plugin.app.vault.append(file, `${tasks.join('\n')}\n`);
		} else {
			await plugin.app.vault.modify(file, appendToSection(content, tasksHeading(content), tasks.join('\n')));
		}
		editor.replaceRange(
			lines.map((line) => markTask(line, '>')).join('\n'),
			{ line: from.line, ch: 0 },
			{ line: to.line, ch: editor.getLine(to.line).length },
		);
		new Notice(t('migrated', { count: tasks.length }));
	}).open();
}

function isJournalPath(plugin: JournalPlugin, path: string): boolean {
	const root = journalFolder(plugin.settings.journalFolder);
	return path === `${root}/Index.md`
		|| path.startsWith(`${root}/Daily/`)
		|| path.startsWith(`${root}/Monthly/`)
		|| path.startsWith(`${root}/Future/`);
}

function run(action: () => Promise<void>): void {
	void action().catch((error: unknown) => {
		new Notice(error instanceof Error ? error.message : t('commandFailed'));
	});
}

export function registerJournalCommands(plugin: JournalPlugin): void {
	const refreshIndexDebounced = debounce(() => {
		void refreshIndex(plugin).catch(() => { /* 自动刷新失败静默 */ });
	}, 1000, true);
	plugin.registerEvent(plugin.app.vault.on('create', (file) => {
		if (isJournalPath(plugin, file.path)) refreshIndexDebounced();
	}));
	plugin.registerEvent(plugin.app.vault.on('rename', (file, oldPath) => {
		if (isJournalPath(plugin, file.path) || isJournalPath(plugin, oldPath)) refreshIndexDebounced();
	}));
	plugin.registerEvent(plugin.app.vault.on('delete', (file) => {
		if (isJournalPath(plugin, file.path)) refreshIndexDebounced();
	}));
	plugin.addCommand({ id: 'open-today', name: t('openToday'), callback: () => run(() => openToday(plugin)) });
	plugin.addCommand({ id: 'open-current-month', name: t('openCurrentMonth'), callback: () => run(() => openCurrentMonth(plugin)) });
	plugin.addCommand({ id: 'open-future-log', name: t('openFutureLog'), callback: () => run(() => openFutureLog(plugin)) });
	plugin.addCommand({ id: 'setup-journal', name: t('setupJournal'), callback: () => run(() => setupJournal(plugin)) });
	plugin.addCommand({ id: 'migrate-unfinished', name: t('migrateUnfinished'), callback: () => run(() => migrateUnfinished(plugin)) });
	plugin.addCommand({ id: 'migrate-monthly-unfinished', name: t('migrateMonthlyUnfinished'), callback: () => run(() => migrateMonthlyUnfinished(plugin)) });
	plugin.addCommand({ id: 'migrate-from-future-log', name: t('migrateFromFutureLog'), callback: () => run(() => migrateFromFutureLog(plugin)) });
	plugin.addCommand({ id: 'update-index', name: t('updateIndex'), callback: () => run(() => updateIndex(plugin)) });
	plugin.addCommand({ id: 'migrate-to-date-or-month', name: t('migrateToTarget'), editorCallback: (editor) => migrateManually(plugin, editor) });
	plugin.addCommand({ id: 'move-to-future-log', name: t('moveToFutureLog'), editorCallback: (editor) => moveToFutureLog(plugin, editor) });
}
