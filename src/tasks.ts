export interface UnfinishedTask {
	line: number;
	text: string;
	content: string;
}

const UNFINISHED_TASK = /^(\s*)([*!?]\s+)?•\s+(.+)$/u;

export function isUnfinishedTask(line: string): boolean {
	return UNFINISHED_TASK.test(line);
}

export function markTask(line: string, symbol: '>' | '<'): string {
	return line.replace(/^(\s*(?:[*!?]\s+)?)•/u, `$1${symbol === '>' ? '\\>' : symbol}`);
}

export function findUnfinishedTasks(text: string): UnfinishedTask[] {
	return text.split('\n').flatMap((line, index) => {
		const match = line.match(UNFINISHED_TASK);
		return match
			? [{ line: index, text: line, content: line }]
			: [];
	});
}
