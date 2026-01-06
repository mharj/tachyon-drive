import {readFile, writeFile} from 'fs/promises';
import path from 'path';
import {type IPersistSerializer, type IStorageDriver, MemoryStorageDriver, nextSerializer} from 'tachyon-drive';
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {CryptoBufferProcessor, FileStorageDriver, type FileStorageDriverOptions, FileUpdateNotify, strToBufferSerializer} from '../src/index.js';

const dataSchema = z.object({
	test: z.string(),
});

type Data = z.infer<typeof dataSchema>;

const jsonSerialization: IPersistSerializer<Data, string> = {
	deserialize: (buffer: string) => JSON.parse(buffer.toString()) as Data,
	name: 'jsonSerialization',
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(jsonSerialization, strToBufferSerializer);

const objectSerializer: IPersistSerializer<Data, Data> = {
	deserialize: (value: Data) => ({...value}),
	name: 'objectSerializer',
	serialize: (data: Data) => ({...data}),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

function sleepPromise(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const loadCryptoProcessor = vi.fn(function () {
	return new CryptoBufferProcessor(() => Buffer.from('some-secret-key'));
});

const driverSet = new Set<{driver: IStorageDriver<Data>; fileName?: string; crypto: boolean}>([
	{
		crypto: false,
		driver: new MemoryStorageDriver('MemoryStorageDriver', objectSerializer, new FileUpdateNotify(path.resolve(__dirname, './update.notify'))),
		fileName: path.resolve(__dirname, './update.notify'),
	},
	{
		crypto: false,
		driver: new FileStorageDriver('FileStorageDriver - file: string', {fileName: path.resolve(__dirname, './test1.json')}, bufferSerializer),
		fileName: path.resolve(__dirname, './test1.json'),
	},
	{
		crypto: false,
		driver: new FileStorageDriver(
			'FileStorageDriver - file: Promise<string>',
			{fileName: Promise.resolve(path.resolve(__dirname, './test2.json'))},
			bufferSerializer,
		),
		fileName: path.resolve(__dirname, './test2.json'),
	},
	{
		crypto: true,
		driver: new FileStorageDriver(
			'CryptFileStorageDriver - file: () => string',
			{fileName: () => path.resolve(__dirname, './test1.aes')},
			bufferSerializer,
			loadCryptoProcessor,
		),
		fileName: path.resolve(__dirname, './test1.aes'),
	},
	{
		crypto: true,
		driver: new FileStorageDriver(
			'CryptFileStorageDriver - file: () => Promise<string>',
			{fileName: () => Promise.resolve(path.resolve(__dirname, './test2.aes'))},
			bufferSerializer,
			loadCryptoProcessor,
		),
		fileName: path.resolve(__dirname, './test2.aes'),
	},
]);

const data = dataSchema.parse({test: 'demo'});

const onUpdateSpy = vi.fn((_value: Data | undefined) => {});

describe('StorageDriver', function () {
	driverSet.forEach(({driver: currentDriver, fileName, crypto}) => {
		describe(currentDriver.name, function () {
			beforeEach(function () {
				onUpdateSpy.mockReset();
				loadCryptoProcessor.mockReset();
			});
			beforeAll(async function () {
				currentDriver.on('update', onUpdateSpy);
				await currentDriver.clear();
				expect(currentDriver.isInitialized).equals(false);
			});
			it('should be empty store', async function () {
				await expect(currentDriver.hydrate()).resolves.toEqual(undefined);
				expect(currentDriver.isInitialized).equals(true);
				expect(onUpdateSpy.mock.calls.length).equals(0);
				expect(loadCryptoProcessor.mock.calls.length).equals(crypto ? 1 : 0);
			});
			it('should store to storage driver', async function () {
				await currentDriver.store(data);
				await expect(currentDriver.hydrate()).resolves.toStrictEqual(data);
				expect(currentDriver.isInitialized).equals(true);
				expect(onUpdateSpy.mock.calls.length).equals(0);
				expect(loadCryptoProcessor.mock.calls.length).equals(0); // crypto loads only once
			});
			it('should restore data from storage driver', async function () {
				await expect(currentDriver.hydrate()).resolves.toStrictEqual(data);
				expect(currentDriver.isInitialized).equals(true);
				expect(onUpdateSpy.mock.calls.length).equals(0);
				expect(loadCryptoProcessor.mock.calls.length).equals(0); // crypto loads only once
			});
			it('should noticed external file change and notify', async function () {
				if (fileName) {
					// MemoryStorageDriver with FileUpdateNotify does need actual time change to trigger update
					if (currentDriver instanceof MemoryStorageDriver) {
						await writeFile(fileName, Date.now().toString());
					} else {
						await writeFile(fileName, await readFile(fileName));
					}
					await sleepPromise(200);
					expect(onUpdateSpy.mock.calls.length).to.be.greaterThan(0);
				}
			});
			it('should clear to storage driver', async function () {
				await currentDriver.clear();
				expect(currentDriver.isInitialized).equals(false);
				await expect(currentDriver.hydrate()).resolves.toEqual(undefined);
				expect(currentDriver.isInitialized).equals(true);
			});
			it('should unload to storage driver', async function () {
				expect(currentDriver.isInitialized).equals(true);
				await currentDriver.unload();
				expect(currentDriver.isInitialized).equals(false);
				expect(onUpdateSpy.mock.calls.length).equals(0);

				await currentDriver.unload(); // should be safe to call multiple times
			});
		});
	});
	describe('Broken StorageDriver', function () {
		it('should fail to start if fileName is not valid', async function () {
			const brokenDriver = new FileStorageDriver('BrokenDriver', {} as FileStorageDriverOptions, bufferSerializer);
			await expect(brokenDriver.init()).to.rejects.toThrowError(`FileStorageDriver 'BrokenDriver' fileName argument must return a string, value: undefined`);
		});
	});
	describe('Broken serializer', function () {
		it('should throw error if serialized does not provide buffer data', async function () {
			const brokenSerializer = {
				deserialize: (buffer: Buffer) => buffer,
				serialize: (data: Data) => data,
				validator: (data: Data) => dataSchema.safeParse(data).success,
			} as unknown as IPersistSerializer<Data, Buffer>;

			const brokenDriver = new FileStorageDriver('BrokenSerializer', {fileName: path.resolve(__dirname, './test.json')}, brokenSerializer);
			await expect(brokenDriver.store(data)).to.rejects.toThrowError(`FileStorageDriver 'BrokenSerializer' can only store Buffers`);
		});
	});
});
