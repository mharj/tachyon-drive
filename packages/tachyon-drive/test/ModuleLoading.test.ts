import {describe, expect, it} from 'vitest';

describe('tachyon-drive', () => {
	it('test CJS loading', () => {
		const {MemoryStorageDriver} = require('tachyon-drive');
		expect(MemoryStorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {MemoryStorageDriver} = await import('tachyon-drive');
		expect(MemoryStorageDriver).toBeInstanceOf(Object);
	});
});
