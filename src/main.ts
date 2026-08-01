import { Plugin } from 'obsidian';
import { registerBulletCommands } from './commands';
import { registerJournalCommands } from './journal';
import { registerBulletRendering } from './rendering';
import {
	BulletJournalSettings,
	BulletJournalSettingsTab,
	DEFAULT_SETTINGS,
} from './settings';

export default class BulletJournalPlugin extends Plugin {
	settings!: BulletJournalSettings;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<BulletJournalSettings>);
		registerBulletCommands(this);
		registerJournalCommands(this);
		registerBulletRendering(this);
		this.addSettingTab(new BulletJournalSettingsTab(this.app, this));
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
