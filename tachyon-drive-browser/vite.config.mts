/// <reference types="vitest" />

import {defineConfig} from 'vite';

export default defineConfig({
	test: {
		reporters: process.env.GITHUB_ACTIONS ? ['github-actions', 'junit'] : ['verbose', 'github-actions', 'junit'],
		outputFile: {
			junit: '../test-results.xml',
		},
		coverage: {
			provider: 'v8',
			include: ['src/**/*.mts'],
			reporter: ['text'],
		},
		projects: [
			{
				test: {
					name: 'chrome',
					browser: {
						provider: 'playwright',
						enabled: true,
						headless: true,
						instances: [
							{
								browser: 'chromium',
							},
						],
					},
					include: ['test/**/*.test.mts'],
				},
				optimizeDeps: {
					include: ['tachyon-drive', 'sinon', 'zod'],
				},
			},
			{
				test: {
					name: 'firefox',
					browser: {
						provider: 'playwright',
						enabled: true,
						headless: false,
						instances: [
							{
								browser: 'firefox',
							},
						],
					},
					include: ['test/**/*.test.mts'],
				},
				optimizeDeps: {
					include: ['tachyon-drive', 'sinon', 'zod'],
				},
			},
		],
	},
	optimizeDeps: {
		include: ['tachyon-drive', 'sinon', 'zod'],
	},
});
