import {describe, expect, it} from 'vitest';

describe('tachyon-drive-redis', () => {
	it('test CJS loading', () => {
		const {RedisStorageDriver} = require('tachyon-drive-redis');
		expect(RedisStorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {RedisStorageDriver} = await import('tachyon-drive-redis');
		expect(RedisStorageDriver).toBeInstanceOf(Object);
	});
});
