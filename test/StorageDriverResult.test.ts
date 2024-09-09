/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable sort-keys */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'mocha';
import * as chai from 'chai';
import {
	type ExternalNotifyEventsMap,
	type IExternalNotify,
	type IPersistSerializer,
	type IStoreProcessor,
	isValidPersistSerializer,
	MemoryStorageDriver,
	nextSerializer,
} from '../src/index.js';
import chaiAsPromised from 'chai-as-promised';
import {EventEmitter} from 'events';
import type {IResult} from '@luolapeikko/result-option';
import sinon from 'sinon';
import {z} from 'zod';

chai.use(chaiAsPromised);

const expect = chai.expect;

const dataSchema = z.object({
	test: z.string(),
});

type Data = z.infer<typeof dataSchema>;

const nullProcessor: IStoreProcessor<Data> = {
	name: 'NullProcessor',
	preStore: async (data: Data) => data,
	postHydrate: async (data: Data) => data,
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
	deserialize: (buffer: string) => JSON.parse(buffer),
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

const onInitSpy = sinon.spy();
const onHydrateSpy = sinon.spy();
const onStoreSpy = sinon.spy();
const onClearSpy = sinon.spy();
const onUnloadSpy = sinon.spy();

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
const onUpdateEmitterSpy = sinon.spy(notifier, 'notifyUpdate');

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
	before(async () => {
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
			before(async () => {
				driver.on('init', onInitSpy);
				driver.on('hydrate', onHydrateSpy);
				driver.on('store', onStoreSpy);
				driver.on('clear', onClearSpy);
				driver.on('unload', onUnloadSpy);
				driver.on('update', (data) => {
					expect(data).to.be.eql(data);
				});
				expect((await driver.clearResult()).isOk).to.be.eq(true);
				expect(driver.isInitialized).to.be.eq(false);
			});
			it('should be init store', async () => {
				const initResult = await driver.initResult();
				expect(initResult.isOk).to.be.eq(true);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 0, store: 0, clear: 0, unload: 0});
				const clearResult = await driver.clearResult();
				expect(clearResult.isOk).to.be.eq(true);
			});
			it('should be empty store', async () => {
				const result = await driver.hydrateResult();
				expect(result.isOk).to.be.eq(true);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 0, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(0);
			});
			it('should store to storage driver', async () => {
				const storeResult = await driver.storeResult(data);
				expect(storeResult.isOk).to.be.eq(true);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.isOk).to.be.eq(true);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 2, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(1);
			});
			it('should restore data from storage driver', async () => {
				await driver.setData(initValue as any);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.isOk).to.be.eq(true);
				expect(hydrateResult.ok()).to.be.eql(data);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 0, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(0);
			});
			it('should clear to storage driver', async () => {
				const clearResult = await driver.clearResult();
				expect(clearResult.isOk).to.be.eq(true);
				expect(driver.isInitialized).to.be.eq(false);
				await expect(driver.hydrate()).to.be.eventually.eq(undefined);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 0, clear: 2, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(1);
			});
			it('should unload driver', async () => {
				await driver.init();
				expect(driver.isInitialized).to.be.eq(true);
				const unloadResult = await driver.unloadResult();
				expect(unloadResult.isOk).to.be.eq(true);
				expect(unloadResult.ok()).to.be.eq(true);
				expect(driver.isInitialized).to.be.eq(false);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 0, store: 0, clear: 0, unload: 2});
			});
			it('should give undefined if not valid data', async () => {
				await driver.store('ASD' as any);
				const hydrateResult = await driver.hydrateResult();
				expect(hydrateResult.ok()).to.be.eq(undefined);
			});
			it('should throw error when strict validation', async () => {
				await driver.store('ASD' as any);
				const hydrateResult = await driver.hydrateResult({validationThrowsError: true});
				expect(() => hydrateResult.unwrap()).to.throw(Error);
			});
			it('should clone input data', async () => {
				expect(driver.clone(data)).to.be.eql(data);
			});
			it('should clone Result input data', async () => {
				const cloneResult: IResult<{test: string}> = driver.cloneResult(data);
				expect(cloneResult.isOk).to.be.eq(true);
				expect(cloneResult.ok()).to.be.eql(data);
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
					deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
					validator: (data: Data) => dataSchema.safeParse(data).success,
				}),
			).to.be.eq(true);
			expect(
				isValidPersistSerializer({
					serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
					deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
				}),
			).to.be.eq(true);
		});
	});
});
