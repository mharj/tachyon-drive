/// <reference types="vitest" />

import {defineConfig} from 'vite';

export default defineConfig({
	test: {
    reporters: process.env.GITHUB_ACTIONS ? ['github-actions'] : ['verbose'],
		coverage: {
			provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text'],
		},
		include: ['test/**/*.test.ts'],
	},
});
