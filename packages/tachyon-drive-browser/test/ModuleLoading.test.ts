import {describe, expect, it} from 'vitest';

describe('tachyon-drive-browser', () => {
	it('test CJS loading', () => {
		const {CacheStorageDriver} = require('tachyon-drive-browser');
		expect(CacheStorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {CacheStorageDriver} = await import('tachyon-drive-browser');
		expect(CacheStorageDriver).toBeInstanceOf(Object);
	});
});
