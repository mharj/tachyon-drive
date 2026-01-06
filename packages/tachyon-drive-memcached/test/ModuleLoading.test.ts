import {describe, expect, it} from 'vitest';

describe('tachyon-drive-browser', () => {
	it('test CJS loading', () => {
		const {MemcachedStorageDriver} = require('tachyon-drive-memcached');
		expect(MemcachedStorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {MemcachedStorageDriver} = await import('tachyon-drive-memcached');
		expect(MemcachedStorageDriver).toBeInstanceOf(Object);
	});
});
