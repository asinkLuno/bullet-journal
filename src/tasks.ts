export interface UnfinishedTask {
	line: number;
	text: string;
	content: string;
}

export function findUnfinishedTasks(text: string): UnfinishedTask[] {
	return text.split('\n').flatMap((line, index) => {
		const match = line.match(/^(\s*)•\s+(.+)$/u);
		return match
			? [{ line: index, text: line, content: `${match[1] ?? ''}• ${match[2] ?? ''}` }]
			: [];
	});
}
