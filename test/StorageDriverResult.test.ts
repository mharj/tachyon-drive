import {EventEmitter} from 'events';
import type {IResult} from '@luolapeikko/result-option';
import {spy} from 'sinon';
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
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
	preStore: (data: Data) => Promise.resolve(data),
	postHydrate: (data: Data) => Promise.resolve(data),
};

const objectSerializer: IPersistSerializer<Data, Data> = {
	name: 'ObjectSerializer',
	serialize: (data: Data) => ({...data}),
	deserialize: (value: Data) => ({...value}),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const jsonSerializer: IPersistSerializer<Data, string> = {
	name: 'JsonSerializer',
	serialize: (data: Data) => JSON.stringify(data),
	deserialize: (buffer: string) => JSON.parse(buffer) as Data,
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const objecToJson: IPersistSerializer<Data, string> = nextSerializer<Data, Data, string>(objectSerializer, jsonSerializer);

const strToBufferSerializer: IPersistSerializer<string, Buffer> = {
	name: 'StrToBufferSerializer',
	serialize: (data: string) => Buffer.from(data),
	deserialize: (buffer: Buffer) => buffer.toString(),
	validator: (data: string) => typeof data === 'string',
};

// [Object <=> Object] => [Object <=> JSON] => [JSON <=> Buffer]
const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(objecToJson, strToBufferSerializer);

const onInitSpy = spy();
const onHydrateSpy = spy();
const onStoreSpy = spy();
const onClearSpy = spy();
const onUnloadSpy = spy();

export function getCallCounts() {
	return {
		init: onInitSpy.callCount,
		hydrate: onHydrateSpy.callCount,
		store: onStoreSpy.callCount,
		clear: onClearSpy.callCount,
		unload: onUnloadSpy.callCount,
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
const onUpdateEmitterSpy = spy(notifier, 'notifyUpdate');

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
				onInitSpy.resetHistory();
				onHydrateSpy.resetHistory();
				onStoreSpy.resetHistory();
				onClearSpy.resetHistory();
				onUnloadSpy.resetHistory();
				onUpdateEmitterSpy.resetHistory();
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
				expect(getCallCounts()).toStrictEqual({init: 2, hydrate: 0, store: 0, clear: 0, unload: 0});
				const clearResult = await driver.clearResult();
				expect(clearResult.isOk).equals(true);
			});
			it('should be empty store', async () => {
				const result = await driver.hydrateResult();
				expect(result.isOk).equals(true);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({init: 2, hydrate: 2, store: 0, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).equals(0);
			});
			it('should store to storage driver', async () => {
				const storeResult = await driver.storeResult(data);
				expect(storeResult.isOk).equals(true);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.isOk).equals(true);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({init: 2, hydrate: 2, store: 2, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).equals(1);
			});
			it('should restore data from storage driver', async () => {
				await driver.setData(initValue as any);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.isOk).equals(true);
				expect(hydrateResult.ok()).toStrictEqual(data);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({init: 2, hydrate: 2, store: 0, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).equals(0);
			});
			it('should clear to storage driver', async () => {
				const clearResult = await driver.clearResult();
				expect(clearResult.isOk).equals(true);
				expect(driver.isInitialized).equals(false);
				await expect(driver.hydrate()).resolves.toEqual(undefined);
				expect(driver.isInitialized).equals(true);
				expect(getCallCounts()).toStrictEqual({init: 2, hydrate: 2, store: 0, clear: 2, unload: 0});
				expect(onUpdateEmitterSpy.callCount).equals(1);
			});
			it('should unload driver', async () => {
				await driver.init();
				expect(driver.isInitialized).equals(true);
				const unloadResult = await driver.unloadResult();
				expect(unloadResult.isOk).equals(true);
				expect(unloadResult.ok()).equals(true);
				expect(driver.isInitialized).equals(false);
				expect(getCallCounts()).toStrictEqual({init: 2, hydrate: 0, store: 0, clear: 0, unload: 2});
			});
			it('should give undefined if not valid data', async () => {
				await driver.store('ASD' as any);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.ok()).equals(undefined);
			});
			it('should throw error when strict validation', async () => {
				await driver.store('ASD' as any);
				const hydrateResult = await driver.hydrateResult({validationThrowsError: true});
				expect(() => hydrateResult.unwrap()).to.throw(Error);
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
					serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
					deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as Data,
					validator: (data: Data) => dataSchema.safeParse(data).success,
				}),
			).equals(true);
			expect(
				isValidPersistSerializer({
					serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
					deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as Data,
				}),
			).equals(true);
		});
	});
});
