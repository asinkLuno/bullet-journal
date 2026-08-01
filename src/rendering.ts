import { Plugin } from 'obsidian';

interface BulletLine {
	indent: number;
	text: string;
}

export function parseBulletLines(text: string): BulletLine[] | null {
	const lines = text.split('\n').filter((line) => line.trim());
	const parsed = lines.map((line) => {
		const match = line.match(/^([ \t]*)([•×><–○]\s+.+)$/u);
		return match
			? { indent: (match[1] ?? '').replaceAll('\t', '    ').length, text: match[2] ?? '' }
			: null;
	});
	return parsed.length && parsed.every((line) => line !== null)
		? parsed
		: null;
}

function renderBulletList(lines: BulletLine[]): HTMLUListElement {
	const root = activeDocument.body.createEl('ul', { cls: 'bullet-journal-list' });
	root.remove();
	const levels = [{ indent: lines[0]?.indent ?? 0, list: root }];
	let previous: HTMLLIElement | null = null;

	for (const line of lines) {
		while (levels.length > 1 && line.indent < (levels.at(-1)?.indent ?? 0))
			levels.pop();
		if (previous && line.indent > (levels.at(-1)?.indent ?? 0)) {
			const nested = previous.createEl('ul', { cls: 'bullet-journal-list' });
			levels.push({ indent: line.indent, list: nested });
		}
		const item = levels.at(-1)?.list.createEl('li', {
			cls: 'bullet-journal-item',
			text: line.text,
		});
		previous = item ?? null;
	}
	return root;
}

export function registerBulletRendering(plugin: Plugin): void {
	plugin.registerMarkdownPostProcessor((element: HTMLElement) => {
		const paragraphs = element.tagName === 'P' ? [element] : element.findAll('p');
		for (const paragraph of paragraphs) {
			const lines = parseBulletLines(paragraph.textContent ?? '');
			if (lines) paragraph.replaceWith(renderBulletList(lines));
		}
	});
}
