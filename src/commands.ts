import { Editor, Plugin } from 'obsidian';
import { t } from './i18n';

export const BULLETS = ['•', '×', '\\>', '<', '–', '○'] as const;
export const SIGNIFIERS = ['*', '!', '?'] as const;

export function cycleBullet(line: string): string {
	const match = line.match(/^(\s*)([*!?]\s+(?=[•×<–○]|\\?>))?(?:[-*+]\s+)?([•×<–○]|\\?>)?\s*(.*)$/u);
	if (!match) return line;

	const [, indent = '', signifier = '', current, content = ''] = match;
	const normalized = current === '>' ? '\\>' : current;
	const index = normalized ? BULLETS.indexOf(normalized as (typeof BULLETS)[number]) : -1;
	return `${indent}${signifier}${BULLETS[(index + 1) % BULLETS.length]} ${content}`.trimEnd();
}

export function cycleSignifier(line: string): string {
	const match = line.match(/^(\s*)([*!?]\s+)?((?:[•×<–○]|\\?>)\s+.*)$/u);
	if (!match) return line;

	const [, indent = '', signifier = '', rest = ''] = match;
	if (!signifier) return `${indent}${SIGNIFIERS[0]} ${rest}`;
	const index = SIGNIFIERS.indexOf(signifier.trim() as (typeof SIGNIFIERS)[number]);
	return index === SIGNIFIERS.length - 1
		? `${indent}${rest}`
		: `${indent}${SIGNIFIERS[index + 1]} ${rest}`;
}

function forEachSelectedLine(editor: Editor, transform: (line: string) => string): void {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const lines = Array.from(
		{ length: to.line - from.line + 1 },
		(_, offset) => editor.getLine(from.line + offset),
	);
	editor.replaceRange(
		lines.map(transform).join('\n'),
		{ line: from.line, ch: 0 },
		{ line: to.line, ch: editor.getLine(to.line).length },
	);
}

function cycleCurrentLines(editor: Editor): void {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const lines = Array.from(
		{ length: to.line - from.line + 1 },
		(_, offset) => editor.getLine(from.line + offset),
	);
	const completionRect = lines[0]?.includes('•')
		? findActiveSymbol('•')
		: null;
	forEachSelectedLine(editor, cycleBullet);
	if (completionRect) animateCompletion(completionRect);
}

function findActiveSymbol(symbol: string): DOMRect | null {
	const line = activeDocument.querySelector(
		'.workspace-leaf.mod-active .cm-activeLine',
	);
	if (!line) return null;

	const walker = activeDocument.createTreeWalker(line, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const index = node.textContent?.indexOf(symbol) ?? -1;
		if (index < 0) continue;
		const range = activeDocument.createRange();
		range.setStart(node, index);
		range.setEnd(node, index + symbol.length);
		return range.getBoundingClientRect();
	}
	return null;
}

function animateCompletion(rect: DOMRect): void {
	if (activeWindow.matchMedia('(prefers-reduced-motion: reduce)').matches)
		return;

	const overlay = activeDocument.body.createDiv({ cls: 'bullet-journal-animation' });
	overlay.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
	const dot = overlay.createSpan({ cls: 'bullet-journal-animation__dot' });
	const strokes = [45, -45].map((angle) => {
		const stroke = overlay.createSpan({ cls: 'bullet-journal-animation__stroke' });
		return { stroke, angle };
	});
	const animations = [
		dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(0)' }], {
			duration: 140,
			easing: 'ease-in',
			fill: 'forwards',
		}),
		...strokes.map(({ stroke, angle }, index) =>
			stroke.animate(
				[
					{ transform: `rotate(${angle}deg) scaleX(0)` },
					{ transform: `rotate(${angle}deg) scaleX(1)` },
				],
				{
					duration: 180,
					delay: 80 + index * 45,
					easing: 'ease-out',
					fill: 'forwards',
				},
			),
		),
	];
	void Promise.allSettled(animations.map(({ finished }) => finished)).then(() =>
		overlay.remove(),
	);
}

export function registerBulletCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: 'cycle-bullet-symbol',
		name: t('cycleBullet'),
		editorCallback: cycleCurrentLines,
	});
	plugin.addCommand({
		id: 'cycle-signifier',
		name: t('cycleSignifier'),
		editorCallback: (editor) => forEachSelectedLine(editor, cycleSignifier),
	});
}
