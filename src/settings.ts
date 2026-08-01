import { App, PluginSettingTab, Setting } from 'obsidian';
import type BulletJournalPlugin from './main';
import { t } from './i18n';

export interface BulletJournalSettings {
	journalFolder: string;
}

export const DEFAULT_SETTINGS: BulletJournalSettings = {
	journalFolder: 'Bullet Journal',
};

export class BulletJournalSettingsTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: BulletJournalPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName(t('bulletJournalFolder'))
			.setDesc(t('bulletJournalFolderDesc'))
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.journalFolder)
					.setValue(this.plugin.settings.journalFolder)
					.onChange(async (value) => {
						this.plugin.settings.journalFolder = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}
}
