import type {IResult} from '@luolapeikko/result-option';
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
} from '../src/index.js';

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

const memoryObjectDriver = new MemoryStorageDriver('MemoryStorageDriver - Object', objectSerializer, notifier, nullProcessor);

const data = dataSchema.parse({test: 'demo'});

const driverSet = new Set([
	{driver: memoryObjectDriver, initValue: objectSerializer.serialize(data, undefined)},
	{driver: new MemoryStorageDriver('MemoryStorageDriver - Buffer', bufferSerializer, notifier), initValue: bufferSerializer.serialize(data, undefined)},
	{
		driver: new MemoryStorageDriver('MemoryStorageDriver - Object', objectSerializer, notifier, () => nullProcessor),
		initValue: objectSerializer.serialize(data, undefined),
	},
]);

describe('StorageDriver Result', () => {
	beforeAll(async () => {
		await memoryObjectDriver.setData(undefined);
	});
	driverSet.forEach(({driver, initValue}) => {
		describe(driver.name, () => {
			beforeEach(() => {
				onInitSpy.mockReset();
				onHydrateSpy.mockReset();
				onStoreSpy.mockReset();
				onClearSpy.mockReset();
				onUnloadSpy.mockReset();
				onUpdateEmitterSpy.mockReset();
			});
			beforeAll(async () => {
				driver.on('init', onInitSpy);
				driver.on('hydrate', onHydrateSpy);
				driver.on('store', onStoreSpy);
				driver.on('clear', onClearSpy);
				driver.on('unload', onUnloadSpy);
				driver.on('update', (data) => {
					expect(data).toStrictEqual(data);
				});
				expect((await driver.clearResult()).isOk).equals(true);
				expect(driver.isInitialized).equals(false);
			});
			it('should be init store', async () => {
				const initResult = await driver.initResult();
				expect(initResult.isOk).equals(true);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 0, init: 2, store: 0, unload: 0});
				const clearResult = await driver.clearResult();
				expect(clearResult.isOk).equals(true);
			});
			it('should be empty store', async () => {
				const result = await driver.hydrateResult();
				expect(result.isOk).equals(true);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 2, init: 2, store: 0, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(0);
			});
			it('should store to storage driver', async () => {
				const storeResult = await driver.storeResult(data);
				expect(storeResult.isOk).equals(true);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.isOk).equals(true);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 2, init: 2, store: 2, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(1);
			});
			it('should restore data from storage driver', async () => {
				await driver.setData(initValue as any);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.isOk).equals(true);
				expect(hydrateResult.ok()).toStrictEqual(data);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 2, init: 2, store: 0, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(0);
			});
			it('should clear to storage driver', async () => {
				const clearResult = await driver.clearResult();
				expect(clearResult.isOk).equals(true);
				expect(driver.isInitialized).equals(false);
				await expect(driver.hydrate()).resolves.toEqual(undefined);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({clear: 2, hydrate: 2, init: 2, store: 0, unload: 0});
				expect(onUpdateEmitterSpy.mock.calls.length).equals(1);
			});
			it('should unload driver', async () => {
				await driver.init();
				expect(driver.isInitialized).equals(true);
				const unloadResult = await driver.unloadResult();
				expect(unloadResult.isOk).equals(true);
				expect(unloadResult.ok()).equals(true);
				expect(driver.isInitialized).equals(false);
				expect(getCallCounts()).toStrictEqual({clear: 0, hydrate: 0, init: 2, store: 0, unload: 2});
			});
			it('should give undefined if not valid data', async () => {
				await driver.store('ASD' as any);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.ok()).equals(undefined);
			});
			it('should throw error when strict validation', async () => {
				await driver.store('ASD' as any);
				const hydrateResult = await driver.hydrateResult({validationThrowsError: true});
				expect(() => hydrateResult.unwrap()).to.throw(Error, `${driver.name}: hydrate() validator failed`);
			});
			it('should clone input data', () => {
				expect(driver.clone(data)).toStrictEqual(data);
			});
			it('should clone Result input data', () => {
				const cloneResult: IResult<{test: string}> = driver.cloneResult(data);
				expect(cloneResult.isOk).equals(true);
				expect(cloneResult.ok()).toStrictEqual(data);
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
});
