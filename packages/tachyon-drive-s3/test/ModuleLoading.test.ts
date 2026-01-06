import {describe, expect, it} from 'vitest';

describe('tachyon-drive-s3', () => {
	it('test CJS loading', () => {
		const {AwsS3StorageDriver} = require('tachyon-drive-s3');
		expect(AwsS3StorageDriver).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {AwsS3StorageDriver} = await import('tachyon-drive-s3');
		expect(AwsS3StorageDriver).toBeInstanceOf(Object);
	});
});
