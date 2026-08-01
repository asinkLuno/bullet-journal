import { Modal, Notice, Plugin, Setting } from 'obsidian';
import { FutureMonth } from './future';
import { t } from './i18n';
import { UnfinishedTask } from './tasks';

export class MigrationModal extends Modal {
	private readonly selected = new Set<number>();

	constructor(
		plugin: Plugin,
		private readonly tasks: Pick<UnfinishedTask, 'content'>[],
		private readonly migrate: (selected: Set<number>) => Promise<void>,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle(t('migrateUnfinished'));
		this.tasks.forEach((task, index) => {
			new Setting(this.contentEl)
				.setName(task.content.trimStart())
				.addToggle((toggle) => toggle.onChange((checked) => {
					if (checked) this.selected.add(index);
					else this.selected.delete(index);
				}));
		});
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

export class ManualMigrationModal extends Modal {
	constructor(plugin: Plugin, private readonly submit: (target: string) => Promise<void>) {
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

export class FutureMonthModal extends Modal {
	constructor(
		plugin: Plugin,
		private readonly months: FutureMonth[],
		private readonly submit: (month: FutureMonth) => Promise<void>,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.setTitle(t('moveToFutureLog'));
		this.months.forEach((month, index) => {
			new Setting(this.contentEl)
				.setName(month.value)
				.setDesc(t('monthsAhead', { count: index + 1 }))
				.addButton((button) => button
					.setButtonText(t('move'))
					.setCta()
					.onClick(() => {
						void this.submit(month)
							.then(() => this.close())
							.catch((error: unknown) => {
								new Notice(error instanceof Error ? error.message : t('migrationFailed'));
							});
					}));
		});
	}
}
