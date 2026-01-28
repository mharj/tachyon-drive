import {LogLevel} from '@avanio/logger-like';
import {EventEmitter} from 'events';
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {
	type ExternalNotifyEventsMap,
	type IExternalNotify,
	type IPersistSerializer,
	type IStoreProcessor,
	isValidPersistSerializer,
	MemoryStorageDriver,
	nextSerializer,
	StorageDriver,
	type StorageDriverLogMapping,
} from '../src/index.js';
import {resetLoggerSpies, sinonLoggerSpy} from './lib/loggerSpy.js';
import {TestMemoryStorageDriver} from './lib/testDriver.js';
import {ControlledJsonSerializer} from './lib/testSerializer.js';

const unitTestLogMap: StorageDriverLogMapping = {
	clear: LogLevel.Debug,
	deserialize: LogLevel.Debug,
	hydrate: LogLevel.Debug,
	init: LogLevel.Debug,
	processor: LogLevel.Debug,
	store: LogLevel.Debug,
	unload: LogLevel.Debug,
	update: LogLevel.Debug,
	validator: LogLevel.Debug,
};

const dataSchema = z.object({
	test: z.string(),
});

type Data = z.infer<typeof dataSchema>;

const nullProcessor: IStoreProcessor<Data> = {
	name: 'NullProcessor',
	postHydrate: (data: Data) => Promise.resolve(data),
	preStore: (data: Data) => Promise.resolve(data),
};

const objectSerializer: IPersistSerializer<Data, Data> = {
	deserialize: (value: Data) => ({...value}),
	name: 'ObjectSerializer',
	serialize: (data: Data) => ({...data}),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const jsonSerializer: IPersistSerializer<Data, string> = {
	deserialize: (buffer: string) => JSON.parse(buffer) as Data,
	name: 'JsonSerializer',
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const objectToJson: IPersistSerializer<Data, string> = nextSerializer<Data, Data, string>(objectSerializer, jsonSerializer);

const strToBufferSerializer: IPersistSerializer<string, Buffer> = {
	deserialize: (buffer: Buffer) => buffer.toString(),
	name: 'StrToBufferSerializer',
	serialize: (data: string) => Buffer.from(data),
	validator: (data: string) => typeof data === 'string',
};

// [Object <=> Object] => [Object <=> JSON] => [JSON <=> Buffer]
const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(objectToJson, strToBufferSerializer);

const onInitSpy = vi.fn();
const onHydrateSpy = vi.fn();
const onStoreSpy = vi.fn();
const onClearSpy = vi.fn();
const onUnloadSpy = vi.fn();

export function getCallCounts(): {init: number; hydrate: number; store: number; clear: number; unload: number} {
	return {
		clear: onClearSpy.mock.calls.length,
		hydrate: onHydrateSpy.mock.calls.length,
		init: onInitSpy.mock.calls.length,
		store: onStoreSpy.mock.calls.length,
		unload: onUnloadSpy.mock.calls.length,
	};
}

class SimpleNotify extends EventEmitter<ExternalNotifyEventsMap> implements IExternalNotify {
	public init() {
		// init
	}

	public unload() {
		// unload
	}

	public notifyUpdate(timeStamp: Date) {
		this.emit('update', timeStamp);
	}
}

const notifier = new SimpleNotify();
const onUpdateEmitterSpy = vi.spyOn(notifier, 'notifyUpdate');

const memoryObjectDriver = new MemoryStorageDriver({name: 'MemoryStorageDriver - Object'}, objectSerializer, notifier, nullProcessor);

const data = dataSchema.parse({test: 'demo'});

const driverSet = new Set([
	{driver: memoryObjectDriver, initValue: objectSerializer.serialize(data, undefined), processor: true},
	{driver: new MemoryStorageDriver({name: 'MemoryStorageDriver - Buffer'}, bufferSerializer, notifier), initValue: bufferSerializer.serialize(data, undefined)},
	{
		driver: new MemoryStorageDriver({name: 'MemoryStorageDriver - Object'}, objectSerializer, notifier, () => nullProcessor),
		initValue: objectSerializer.serialize(data, undefined),
		processor: true,
	},
]);

let brokenTestDriver: TestMemoryStorageDriver<Data, Buffer>;
const brokenTestSerializer = new ControlledJsonSerializer(dataSchema);

describe('StorageDriver', () => {
	beforeAll(async () => {
		await memoryObjectDriver.setData(undefined);
	});
	driverSet.forEach(({driver, initValue, processor}) => {
		describe(driver.name, () => {
			beforeEach(() => {
				onInitSpy.mockReset();
				onHydrateSpy.mockReset();
				onStoreSpy.mockReset();
				onClearSpy.mockReset();
				onUnloadSpy.mockReset();
				onUpdateEmitterSpy.mockReset();
				resetLoggerSpies();
				expect(notifier.listenerCount('update'), 'notifier listener count').equals(0);
			});
			beforeAll(() => {
				if (driver instanceof StorageDriver) {
					driver.logger.setLogger(sinonLoggerSpy);
					driver.logger.setLogMapping(unitTestLogMap);
				}
				driver.on('init', onInitSpy);
				driver.on('hydrate', onHydrateSpy);
				driver.on('store', onStoreSpy);
				driver.on('clear', onClearSpy);
				driver.on('unload', onUnloadSpy);
				driver.on('update', (data) => {
					expect(data).toStrictEqual(data);
				});
				expect(driver.isInitialized).equals(false);
			});
			it('should be empty store', async () => {
				await expect(driver.hydrate()).resolves.toEqual(undefined);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 2, init: 2, store: 0, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(0);
				expect(sinonLoggerSpy.debug.mock.calls.length).equals(processor ? 3 : 2);
			});
			it('should store to storage driver', async () => {
				await driver.store(data);
				await expect(driver.hydrate()).resolves.toEqual(data);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 2, init: 2, store: 2, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(1);
				expect(sinonLoggerSpy.debug.mock.calls.length).to.be.greaterThanOrEqual(3);
			});
			it('should restore data from storage driver', async () => {
				await driver.setData(initValue as any);
				await expect(driver.hydrate()).resolves.toEqual(data);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 2, init: 2, store: 0, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(0);
				expect(sinonLoggerSpy.debug.mock.calls.length).equals(3);
			});
			it('should clear to storage driver', async () => {
				await driver.clear();
				expect(driver.isInitialized).equals(false);
				await expect(driver.hydrate()).resolves.toEqual(undefined);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 2, hydrate: 2, init: 2, store: 0, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(1);
				expect(sinonLoggerSpy.debug.mock.calls.length).equals(3);
			});
			it('should unload driver', async () => {
				await driver.init();
				expect(driver.isInitialized).equals(true);
				await expect(driver.unload()).resolves.toEqual(true);
				expect(driver.isInitialized).equals(false);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 0, init: 2, store: 0, unload: 2});
				expect(sinonLoggerSpy.debug.mock.calls.length).equals(2);
			});
			it('should give undefined if not valid data', async () => {
				await driver.store('ASD' as any);
				await expect(driver.hydrate()).resolves.toEqual(undefined);
				expect(sinonLoggerSpy.debug.mock.calls.length).equals(5);
			});
			it('should throw error when strict validation', async () => {
				await driver.store('ASD' as any);
				await expect(driver.hydrate({validationThrowsError: true})).to.rejects.toThrow(Error);
				expect(sinonLoggerSpy.debug.mock.calls.length).equals(4);
			});
			it('should clone input data', () => {
				expect(driver.clone(data)).toStrictEqual(data);
				expect(driver.cloneResult(data).ok()).toStrictEqual(data);
			});
			it('should get processor result', async () => {
				const processor = await driver.getProcessorResult();
				expect(processor.isOk).equals(true);
			});
			it('should get processor', async () => {
				await driver.init();
				const processor = driver.processor;
				if (!processor) {
					return;
				}
				expect(processor.name).to.be.an('string');
			});
			it('should get get error getting processor if not initialized yet', () => {
				expect(() => driver.processor).toThrow(Error);
			});
			it('should toString()', () => {
				expect(driver.toString()).to.be.an('string');
				expect(driver.toString()).to.satisfies((value: string) => value.startsWith(`${driver.name}(`));
			});
			it('should toJSON()', async () => {
				expect(driver.toJSON()).toStrictEqual({
					bandwidth: driver.bandwidth,
					name: driver.name,
					processor: (await driver.getProcessor())?.name,
					serializer: driver.getSerializer().name,
				});
			});
			afterEach(async () => {
				await driver.unload();
			});
		});
	});
	describe('Serializer validation', () => {
		it('should be valid serializer', () => {
			expect(
				isValidPersistSerializer({
					deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as Data,
					serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
					validator: (data: Data) => dataSchema.safeParse(data).success,
				}),
			).equals(true);
			expect(
				isValidPersistSerializer({
					deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as Data,
					serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
				}),
			).equals(true);
		});
	});
	describe('broken processor', () => {
		it('should throw error when broken processor', async () => {
			const brokenProcessor = {} as IStoreProcessor<Data>;
			const brokenDriver = new MemoryStorageDriver({name: 'BrokenProcessor'}, objectSerializer, notifier, brokenProcessor);
			await expect(brokenDriver.getProcessor()).to.rejects.toThrow(Error);
			const processor = await brokenDriver.getProcessorResult();
			expect(processor.isOk).equals(false);
		});
	});
	describe('broken driver', () => {
		beforeEach(function () {
			brokenTestDriver = new TestMemoryStorageDriver<Data, Buffer>({name: 'BrokenDriver'}, brokenTestSerializer, notifier, undefined);
		});
		it('should throw error when init', async () => {
			brokenTestDriver.setThrows('init');
			await expect(brokenTestDriver.init()).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.initResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when hydrate', async () => {
			brokenTestDriver.setThrows('hydrate');
			await expect(brokenTestDriver.hydrate()).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.hydrateResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when store', async () => {
			brokenTestDriver.setThrows('store');
			await expect(brokenTestDriver.store({test: 'value'})).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.storeResult({test: 'value'})).err()).to.be.instanceOf(Error);
		});
		it('should throw error when clear', async () => {
			brokenTestDriver.setThrows('clear');
			await expect(brokenTestDriver.clear()).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.clearResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when unload', async () => {
			brokenTestDriver.setThrows('unload');
			await expect(brokenTestDriver.unload()).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.unloadResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when unload', async () => {
			brokenTestDriver.setThrows('unload');
			await expect(brokenTestDriver.unload()).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.unloadResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when deserialize', async () => {
			brokenTestSerializer.setThrows('deserialize');
			await brokenTestDriver.setData(Buffer.from(JSON.stringify({test: 'value'})));
			await expect(brokenTestDriver.hydrate({deserializationThrowsError: true})).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.hydrateResult({deserializationThrowsError: true})).err()).to.be.instanceOf(Error);
		});
		it('should throw error when run validation', async () => {
			brokenTestSerializer.setThrows('validator');
			await brokenTestDriver.setData(Buffer.from(JSON.stringify({test: 'value'})));
			await expect(brokenTestDriver.hydrate({validationThrowsError: true})).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.hydrateResult({validationThrowsError: true})).err()).to.be.instanceOf(Error);
		});
		it('should throw error when run serialize', async () => {
			brokenTestSerializer.setThrows('serialize');
			await brokenTestDriver.setData(Buffer.from(JSON.stringify({test: 'value'})));
			await expect(brokenTestDriver.store({test: 'value'})).to.rejects.toThrow(Error);
			expect((await brokenTestDriver.storeResult({test: 'value'})).err()).to.be.instanceOf(Error);
			expect(brokenTestDriver.cloneResult(data).err()).to.be.instanceOf(Error);
		});
	});
});
