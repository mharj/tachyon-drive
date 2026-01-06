import {describe, expect, it} from 'vitest';

describe('tachyon-drive-node-fs', () => {
	it('test CJS loading', () => {
		const {FileStorageDriver} = require('tachyon-drive-node-fs');
		expect(FileStorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {FileStorageDriver} = await import('tachyon-drive-node-fs');
		expect(FileStorageDriver).toBeInstanceOf(Object);
	});
});
