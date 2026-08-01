import { cycleBullet } from './commands';
import { parseBulletLines } from './rendering';
import { formatLocalDate, formatLocalMonth, parseMigrationTarget } from './date';
import { findUnfinishedTasks } from './tasks';

for (const [input, expected] of [
	['Buy milk', '• Buy milk'],
	['• Buy milk', '× Buy milk'],
	['  ○ Meeting', '  • Meeting'],
] as const) {
	if (cycleBullet(input) !== expected) throw new Error(`Failed: ${input}`);
}

if (parseBulletLines('• Task\n\t× Done')?.[1]?.indent !== 4)
	throw new Error('Failed to parse nested bullets');

if (formatLocalDate(new Date(2026, 7, 1)) !== '2026-08-01')
	throw new Error('Failed to format local date');

if (formatLocalMonth(new Date(2026, 7, 1)) !== '2026-08')
	throw new Error('Failed to format local month');

if (parseMigrationTarget('20260731')?.value !== '2026-07-31')
	throw new Error('Failed to parse migration date');

if (parseMigrationTarget('202607')?.value !== '2026-07')
	throw new Error('Failed to parse migration month');

if (parseMigrationTarget('20260230') !== null)
	throw new Error('Accepted an invalid migration date');

if (findUnfinishedTasks('• One\n× Two\n\t• Three').length !== 2)
	throw new Error('Failed to find unfinished tasks');
