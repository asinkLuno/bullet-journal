export function formatLocalDate(date: Date): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, '0'),
		String(date.getDate()).padStart(2, '0'),
	].join('-');
}

export function formatLocalMonth(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export type MigrationTarget = { kind: 'daily' | 'monthly'; value: string };

export function parseMigrationTarget(input: string): MigrationTarget | null {
	if (/^\d{6}$/u.test(input)) {
		const month = Number(input.slice(4));
		return month >= 1 && month <= 12
			? { kind: 'monthly', value: `${input.slice(0, 4)}-${input.slice(4)}` }
			: null;
	}
	if (!/^\d{8}$/u.test(input)) return null;
	const year = Number(input.slice(0, 4));
	const month = Number(input.slice(4, 6));
	const day = Number(input.slice(6));
	const date = new Date(year, month - 1, day);
	return year >= 1000
		&& date.getFullYear() === year
		&& date.getMonth() === month - 1
		&& date.getDate() === day
		? { kind: 'daily', value: `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6)}` }
		: null;
}
