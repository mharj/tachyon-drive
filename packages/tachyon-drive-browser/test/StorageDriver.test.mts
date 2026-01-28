import type {IPersistSerializer, IStorageDriver} from 'tachyon-drive';
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {CacheStorageDriver, CryptoBufferProcessor, LocalStorageDriver, WebFsStorageDriver} from '../src/index.mjs';

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

const loadCryptoProcessor = vi.fn(function () {
	const processor = new CryptoBufferProcessor(() => new TextEncoder().encode('some-secret-key').buffer);
	processor.setLogger(undefined);
	return processor;
});

async function getFileHandle() {
	return (await navigator.storage.getDirectory()).getFileHandle('test.file', {create: true});
}

const driverSet = new Set<{driver: () => IStorageDriver<Data>; crypto?: boolean}>([
	{driver: () => new LocalStorageDriver({keyName: () => Promise.resolve('storageKey'), name: 'LocalStorageDriver1'}, stringSerializer)},
	{driver: () => new LocalStorageDriver({keyName: 'storageKey', name: 'LocalStorageDriver2'}, stringSerializer)},
	{
		crypto: true,
		driver: () =>
			new CacheStorageDriver(
				{
					cache: window.caches.open('test-cache'),
					name: 'CacheStorageDriver1',
					url: Promise.resolve(new URL('https://example.com/data')),
				},
				arrayBufferSerializer,
				loadCryptoProcessor,
			),
	},
	{
		driver: () =>
			new CacheStorageDriver(
				{cache: window.caches.open('test-cache'), name: 'CacheStorageDriver2', url: new URL('https://example.com/data')},
				stringSerializer,
			),
	},
	{
		driver: () =>
			new CacheStorageDriver(
				{cache: window.caches.open('test-cache'), name: 'CacheStorageDriver3', url: new URL('https://example.com/data')},
				stringSerializer,
			),
	},
	{
		driver: () => new WebFsStorageDriver({fileHandle: () => getFileHandle(), name: 'WebFsStorageDriver'}, arrayBufferSerializer),
	},
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', () => {
	describe.each([...driverSet])('StorageDriver', ({driver: driverFn, crypto}) => {
		const currentDriver = driverFn();
		beforeEach(function () {
			loadCryptoProcessor.mockReset();
		});
		beforeAll(async function () {
			await currentDriver.clear();
			expect(currentDriver.isInitialized).to.be.eq(false);
			expect(loadCryptoProcessor.mock.calls.length).equals(0); // should not be loaded yet
		});
		it('should be empty store', async () => {
			expect(await currentDriver.hydrate()).to.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(true);
			expect(loadCryptoProcessor.mock.calls.length).equals(crypto ? 1 : 0);
		});
		it('should store to storage driver', async () => {
			await currentDriver.store(data);
			expect(await currentDriver.hydrate()).to.eql(data);
			expect(currentDriver.isInitialized).to.be.eq(true);
			expect(loadCryptoProcessor.mock.calls.length).equals(0); // crypto loads only once
		});
		it('should restore data from storage driver', async () => {
			expect(await currentDriver.hydrate()).to.eql(data);
			expect(currentDriver.isInitialized).to.be.eq(true);
			expect(loadCryptoProcessor.mock.calls.length).equals(0); // crypto loads only once
		});
		it('should clear to storage driver', async () => {
			await currentDriver.clear();
			expect(currentDriver.isInitialized).to.be.eq(false);
			expect(await currentDriver.hydrate()).to.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should unload to storage driver', async () => {
			expect(currentDriver.isInitialized).to.be.eq(true);
			expect(await currentDriver.unload()).to.eq(true);
			expect(currentDriver.isInitialized).to.be.eq(false);
		});
	});
});
