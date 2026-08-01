import { cycleBullet, cycleSignifier } from './commands';
import { parseBulletLines } from './rendering';
import { monthCalendar } from './calendar';
import { formatLocalDate, formatLocalMonth, parseMigrationTarget } from './date';
import { appendToSection, futureMonths } from './future';
import { findUnfinishedTasks, markTask } from './tasks';

for (const [input, expected] of [
	['Buy milk', '• Buy milk'],
	['• Buy milk', '× Buy milk'],
	['× Buy milk', '\\> Buy milk'],
	['> Old migrated task', '< Old migrated task'],
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
if (findUnfinishedTasks('* • Important').length !== 1)
	throw new Error('Failed to find a signified unfinished task');
if (markTask('* • Important', '>') !== '* \\> Important')
	throw new Error('Failed to preserve a signifier when marking a task');
if (parseBulletLines('\\> Migrated')?.[0]?.text !== '> Migrated')
	throw new Error('Failed to render an escaped migrated task');

const months = futureMonths(new Date(2026, 7, 1));
if (months.length !== 6 || months[0]?.value !== '2026-09' || months[5]?.value !== '2027-02')
	throw new Error('Failed to compute future months');

if (futureMonths(new Date(2026, 11, 1))[0]?.value !== '2027-01')
	throw new Error('Failed to cross year boundary in future months');

const withSections = '# Future Log\n\n## 2026-09\n\n## 2026-10\n';
if (!appendToSection(withSections, '## 2026-09', '• Book flight').includes('## 2026-09\n\n• Book flight\n\n## 2026-10'))
	throw new Error('Failed to insert into an existing section');

if (appendToSection('# Future Log\n', '## 2026-09', '• Book flight').split('\n').includes('• Book flight') !== true)
	throw new Error('Failed to append a missing section');
if (!appendToSection('', '## 2026-09', '• First').startsWith('## 2026-09'))
	throw new Error('Failed to handle empty content');

if (parseMigrationTarget('000001') !== null)
	throw new Error('Accepted an invalid migration month');

if (cycleSignifier('• Task') !== '* • Task')
	throw new Error('Failed to add a signifier');
if (cycleSignifier('* • Task') !== '! • Task')
	throw new Error('Failed to cycle signifier');
if (cycleSignifier('! • Task') !== '? • Task')
	throw new Error('Failed to cycle signifier');
if (cycleSignifier('? • Task') !== '• Task')
	throw new Error('Failed to remove signifier');
if (cycleBullet('* • Task') !== '* × Task')
	throw new Error('Failed to keep signifier when cycling bullet');
if (cycleBullet('* item') !== '• item')
	throw new Error('Signifier regex must not swallow plain list items');
if (parseBulletLines('* • Task')?.[0]?.signifier.trim() !== '*')
	throw new Error('Failed to parse signifier');

const calendar = monthCalendar(2026, 8, ['一', '二', '三', '四', '五', '六', '日']);
if (!calendar.includes('|    |    |    |    |    | 1 | 2 |'))
	throw new Error('Failed to align calendar to Monday start');
if (!calendar.includes('| 31 |'))
	throw new Error('Failed to render the full month');
if (calendar.split('\n').length !== 8)
	throw new Error('Failed calendar row count');
