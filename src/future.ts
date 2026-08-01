export interface FutureMonth {
	year: number;
	month: number;
	value: string;
}

export function futureMonths(from: Date, count = 6): FutureMonth[] {
	return Array.from({ length: count }, (_, index) => {
		const date = new Date(from.getFullYear(), from.getMonth() + 1 + index, 1);
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		return {
			year,
			month,
			value: `${year}-${String(month).padStart(2, '0')}`,
		};
	});
}

export function appendToSection(content: string, section: string, block: string): string {
	const blockLines = block.trim().split('\n').filter((line) => line.trim().length > 0);
	const lines = content.split('\n');
	const start = lines.findIndex((line) => line === section);
	if (start < 0) {
		const tail = blockLines.length ? `\n\n${blockLines.join('\n')}` : '';
		return `${content.trimEnd()}\n\n${section}${tail}\n`;
	}
	let end = start + 1;
	while (end < lines.length && !/^##\s/u.test(lines[end] ?? '')) end++;
	if (blockLines.length) lines.splice(end, 0, ...blockLines, '');
	return lines.join('\n');
}
