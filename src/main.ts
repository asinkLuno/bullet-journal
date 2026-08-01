import { Plugin } from 'obsidian';
import { registerBulletCommands } from './commands';
import { registerBulletRendering } from './rendering';

export default class BulletJournalPlugin extends Plugin {
	onload() {
		registerBulletCommands(this);
		registerBulletRendering(this);
	}
}
