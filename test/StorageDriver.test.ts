/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable sort-keys */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'mocha';
import {
	type ExternalNotifyEventsMap,
	type IExternalNotify,
	type IPersistSerializer,
	type IStoreProcessor,
	isValidPersistSerializer,
	type LogMappingType,
	MemoryStorageDriver,
	nextSerializer,
	StorageDriver,
} from '../src/index.js';
import {resetLoggerSpies, sinonLoggerSpy} from './lib/loggerSpy.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {ControlledJsonSerializer} from './lib/testSerializer.js';
import {EventEmitter} from 'events';
import {LogLevel} from '@avanio/logger-like';
import sinon from 'sinon';
import {TestMemoryStorageDriver} from './lib/testDriver.js';
import zod from 'zod';

const unitTestLogMap: LogMappingType = {
	clear: LogLevel.Debug,
	deserialize: LogLevel.Debug,
	hydrate: LogLevel.Debug,
	init: LogLevel.Debug,
	store: LogLevel.Debug,
	unload: LogLevel.Debug,
	update: LogLevel.Debug,
	validator: LogLevel.Debug,
};

chai.use(chaiAsPromised);

const expect = chai.expect;

const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

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

let brokenTestDriver: TestMemoryStorageDriver<Data, Buffer>;
const brokenTestSerializer = new ControlledJsonSerializer<Data>(dataSchema);

describe('StorageDriver', () => {
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
				resetLoggerSpies();
				expect(notifier.listenerCount('update'), 'notifier listener count').to.be.eq(0);
			});
			before(async () => {
				if (driver instanceof StorageDriver) {
					driver.setLogger(sinonLoggerSpy);
					driver.setLogMapping(unitTestLogMap);
				}
				driver.on('init', onInitSpy);
				driver.on('hydrate', onHydrateSpy);
				driver.on('store', onStoreSpy);
				driver.on('clear', onClearSpy);
				driver.on('unload', onUnloadSpy);
				driver.on('update', (data) => {
					expect(data).to.be.eql(data);
				});
				expect(driver.isInitialized).to.be.eq(false);
			});
			it('should be empty store', async () => {
				await expect(driver.hydrate()).to.be.eventually.eq(undefined);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 0, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(0);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(2);
			});
			it('should store to storage driver', async () => {
				await driver.store(data);
				await expect(driver.hydrate()).to.be.eventually.eql(data);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 2, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(1);
				expect(sinonLoggerSpy.debug.callCount).to.be.greaterThanOrEqual(3);
			});
			it('should restore data from storage driver', async () => {
				await driver.setData(initValue as any);
				await expect(driver.hydrate()).to.be.eventually.eql(data);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 0, clear: 0, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(0);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(3);
			});
			it('should clear to storage driver', async () => {
				await driver.clear();
				expect(driver.isInitialized).to.be.eq(false);
				await expect(driver.hydrate()).to.be.eventually.eq(undefined);
				expect(driver.isInitialized).to.be.eq(true);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 2, store: 0, clear: 2, unload: 0});
				expect(onUpdateEmitterSpy.callCount).to.be.eq(1);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(3);
			});
			it('should unload driver', async () => {
				await driver.init();
				expect(driver.isInitialized).to.be.eq(true);
				await expect(driver.unload()).to.be.eventually.eq(true);
				expect(driver.isInitialized).to.be.eq(false);
				expect(getCallCounts()).to.be.eql({init: 2, hydrate: 0, store: 0, clear: 0, unload: 2});
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(2);
				console.log('ok');
			});
			it('should give undefined if not valid data', async () => {
				await driver.store('ASD' as any);
				await expect(driver.hydrate()).to.be.eventually.eq(undefined);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(5);
			});
			it('should throw error when strict validation', async () => {
				await driver.store('ASD' as any);
				await expect(driver.hydrate({validationThrowsError: true})).to.eventually.be.rejectedWith(Error);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(4);
			});
			it('should clone input data', async () => {
				expect(driver.clone(data)).to.be.eql(data);
				expect(driver.cloneResult(data).ok()).to.be.eql(data);
			});
			it('should get processor result', async () => {
				const processor = await driver.getProcessorResult();
				expect(processor.isOk).to.be.eq(true);
			});
			it('should toString()', async () => {
				expect(driver.toString()).to.be.an('string');
			});
			it('should toJSON()', async () => {
				expect(driver.toJSON()).to.be.eql({
					name: driver.name,
					bandwidth: driver.bandwidth,
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
	describe('broken processor', () => {
		it('should throw error when broken processor', async () => {
			const brokenProcessor = {} as IStoreProcessor<Data>;
			const brokenDriver = new MemoryStorageDriver('BrokenProcessor', objectSerializer, notifier, brokenProcessor);
			await expect(brokenDriver.getProcessor()).to.eventually.be.rejectedWith(Error);
			const processor = await brokenDriver.getProcessorResult();
			expect(processor.isOk).to.be.eq(false);
		});
	});
	describe('broken driver', () => {
		beforeEach(function () {
			brokenTestDriver = new TestMemoryStorageDriver<Data, Buffer>('BrokenDriver', brokenTestSerializer, notifier, undefined);
		});
		it('should throw error when init', async () => {
			brokenTestDriver.setThrows('init');
			await expect(brokenTestDriver.init()).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.initResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when hydrate', async () => {
			brokenTestDriver.setThrows('hydrate');
			await expect(brokenTestDriver.hydrate()).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.hydrateResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when store', async () => {
			brokenTestDriver.setThrows('store');
			await expect(brokenTestDriver.store({test: 'value'})).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.storeResult({test: 'value'})).err()).to.be.instanceOf(Error);
		});
		it('should throw error when clear', async () => {
			brokenTestDriver.setThrows('clear');
			await expect(brokenTestDriver.clear()).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.clearResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when unload', async () => {
			brokenTestDriver.setThrows('unload');
			await expect(brokenTestDriver.unload()).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.unloadResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when unload', async () => {
			brokenTestDriver.setThrows('unload');
			await expect(brokenTestDriver.unload()).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.unloadResult()).err()).to.be.instanceOf(Error);
		});
		it('should throw error when deserialize', async () => {
			brokenTestSerializer.setThrows('deserialize');
			await brokenTestDriver.setData(Buffer.from(JSON.stringify({test: 'value'})));
			await expect(brokenTestDriver.hydrate({deserializationThrowsError: true})).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.hydrateResult({deserializationThrowsError: true})).err()).to.be.instanceOf(Error);
		});
		it('should throw error when run validation', async () => {
			brokenTestSerializer.setThrows('validator');
			await brokenTestDriver.setData(Buffer.from(JSON.stringify({test: 'value'})));
			await expect(brokenTestDriver.hydrate({validationThrowsError: true})).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.hydrateResult({validationThrowsError: true})).err()).to.be.instanceOf(Error);
		});
		it('should throw error when run serialize', async () => {
			brokenTestSerializer.setThrows('serialize');
			await brokenTestDriver.setData(Buffer.from(JSON.stringify({test: 'value'})));
			await expect(brokenTestDriver.store({test: 'value'})).to.eventually.be.rejectedWith(Error);
			expect((await brokenTestDriver.storeResult({test: 'value'})).err()).to.be.instanceOf(Error);
			expect(brokenTestDriver.cloneResult(data).err()).to.be.instanceOf(Error);
		});
	});
});
