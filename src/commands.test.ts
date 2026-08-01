import { cycleBullet } from './commands';
import { parseBulletLines } from './rendering';

for (const [input, expected] of [
	['Buy milk', '• Buy milk'],
	['• Buy milk', '× Buy milk'],
	['  ○ Meeting', '  • Meeting'],
] as const) {
	if (cycleBullet(input) !== expected) throw new Error(`Failed: ${input}`);
}

if (parseBulletLines('• Task\n\t× Done')?.[1]?.indent !== 4)
	throw new Error('Failed to parse nested bullets');
