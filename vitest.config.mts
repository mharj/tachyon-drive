import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	optimizeDeps: {
		include: ['@luolapeikko/logger-type', '@luolapeikko/result-option', '@luolapeikko/core-ts-type', '@luolapeikko/key-logger', 'events', 'zod'],
	},
	resolve: {
		alias: {
			events: 'events',
		},
		tsconfigPaths: true
	},
	test: {
		coverage: {
			exclude: ['**/dist/**', '**/*.test-d.ts', '**/index.ts'],
			include: ['packages/**/*.ts'],
			provider: 'v8',
			reporter: ['text', 'lcov'],
		},
		globals: true,
		projects: [
			// Default Node tests (exclude the browser package)
			{
				test: {
					environment: 'node',
					exclude: ['packages/tachyon-drive-browser/**/*.test.mts'],
					include: ['packages/**/*.test.ts', 'packages/**/*.test.mts'],
					name: 'node',
				},
			},
			// Browser tests only for tachyon-drive-browser
			{
				test: {
					browser: {
						enabled: true,
						headless: true,
						instances: [{browser: 'chromium'}],
						provider: playwright({}),
					},
					include: ['packages/tachyon-drive-browser/**/*.test.mts'],
					name: 'chrome',
				},
			},
		],
		reporters: ['github-actions', 'minimal'],
		typecheck: {include: ['**/*.test-d.ts']},
	},
});
