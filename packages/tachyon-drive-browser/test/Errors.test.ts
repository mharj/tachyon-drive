import type {IPersistSerializer} from 'tachyon-drive';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {CacheStorageDriver, LocalStorageDriver} from '../src/index.mjs';

const dataSchema = z.object({
	test: z.string(),
});

type Data = z.infer<typeof dataSchema>;

const stringSerializer: IPersistSerializer<Data, string> = {
	deserialize: (buffer: string) => JSON.parse(buffer) as Data,
	name: 'stringSerializer',
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const arrayBufferSerializer: IPersistSerializer<Data, ArrayBuffer> = {
	deserialize: (buffer: ArrayBuffer) => JSON.parse(new TextDecoder().decode(buffer)) as Data,
	name: 'arrayBufferSerializer',
	serialize: (data: Data) => new TextEncoder().encode(JSON.stringify(data)).buffer,
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

describe('StorageDriver Errors', () => {
	it('should throw error on constructor', function () {
		expect(() => new LocalStorageDriver('LocalStorageDriver', () => Promise.resolve('storageKey'), stringSerializer, undefined, undefined, undefined)).to.throw(
			'Local storage not supported',
		);
		expect(
			() =>
				new CacheStorageDriver(
					'CacheStorageDriver',
					{cache: window.caches.open('test-cache'), url: new URL('https://example.com/data')},
					arrayBufferSerializer,
					undefined,
					undefined,
				),
		).to.throw('window is not defined');
	});
});
