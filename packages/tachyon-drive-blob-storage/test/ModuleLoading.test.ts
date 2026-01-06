import {describe, expect, it} from 'vitest';

describe('tachyon-drive-blob-storage', () => {
	it('test CJS loading', () => {
		const {AzureBlobStorageDriver} = require('tachyon-drive-blob-storage');
		expect(AzureBlobStorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {AzureBlobStorageDriver} = await import('tachyon-drive-blob-storage');
		expect(AzureBlobStorageDriver).toBeInstanceOf(Object);
	});
});
