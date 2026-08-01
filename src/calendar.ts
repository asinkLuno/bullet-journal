export const WEEKDAYS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
export const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function monthCalendar(
	year: number,
	month: number,
	weekdays: string[] = WEEKDAYS_ZH,
): string {
	const first = new Date(year, month - 1, 1);
	const offset = (first.getDay() + 6) % 7;
	const days = new Date(year, month, 0).getDate();
	const rows = [
		`| ${weekdays.join(' | ')} |`,
		`|${weekdays.map(() => ' --- ').join('|')}|`,
	];
	let cells: string[] = Array<string>(offset).fill('  ');
	for (let day = 1; day <= days; day++) {
		cells.push(String(day));
		if (cells.length === 7) {
			rows.push(`| ${cells.join(' | ')} |`);
			cells = [];
		}
	}
	if (cells.length) rows.push(`| ${[...cells, ...Array<string>(7 - cells.length).fill('  ')].join(' | ')} |`);
	return rows.join('\n');
}
