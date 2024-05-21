/* eslint-disable no-unused-expressions */
/* eslint-disable sort-keys */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'mocha';
import {type ExternalNotifyEventEmitterConstructor, type IExternalNotify} from '../src/interfaces/IExternalUpdateNotify';
import {
	type IPersistSerializer,
	type IStoreProcessor,
	isValidPersistSerializer,
	type LogMappingType,
	MemoryStorageDriver,
	nextSerializer,
	StorageDriver,
} from '../src';
import {resetLoggerSpies, sinonLoggerSpy} from './lib/loggerSpy';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {EventEmitter} from 'events';
import {LogLevel} from '@avanio/logger-like';
import sinon from 'sinon';
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

class SimpleNotify extends (EventEmitter as ExternalNotifyEventEmitterConstructor) implements IExternalNotify {
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
const onUpdateRegisterSpy = sinon.spy(notifier, 'on');
const onUpdateEmitterSpy = sinon.spy(notifier, 'notifyUpdate');

const memoryObjectDriver = new MemoryStorageDriver('MemoryStorageDriver - Object', objectSerializer, notifier, nullProcessor);

const driverSet = new Set([
	memoryObjectDriver,
	new MemoryStorageDriver('MemoryStorageDriver - Buffer', bufferSerializer, notifier),
	new MemoryStorageDriver('MemoryStorageDriver - Object', objectSerializer, notifier, () => nullProcessor),
]);

const data = dataSchema.parse({test: 'demo'});

/**
 * Spy expectations.
 */
function expectEmitSpy(initCallCount: number, hydrateCallCount: number, storeCallCount: number, clearCallCount: number, unloadCallCount: number): void {
	expect(onInitSpy.callCount, 'init check').to.be.eq(initCallCount);
	expect(onHydrateSpy.callCount, 'hydrate check').to.be.eq(hydrateCallCount);
	expect(onStoreSpy.callCount, 'store check').to.be.eq(storeCallCount);
	expect(onClearSpy.callCount, 'clear check').to.be.eq(clearCallCount);
	expect(onUnloadSpy.callCount, 'unload check').to.be.eq(unloadCallCount);
}

describe('StorageDriver', () => {
	before(async () => {
		await memoryObjectDriver.setData(undefined);
	});
	driverSet.forEach((currentDriver) => {
		describe(currentDriver.name, () => {
			beforeEach(() => {
				onInitSpy.resetHistory();
				onHydrateSpy.resetHistory();
				onStoreSpy.resetHistory();
				onClearSpy.resetHistory();
				onUnloadSpy.resetHistory();
				onUpdateEmitterSpy.resetHistory();
				resetLoggerSpies();
			});
			before(async () => {
				if (currentDriver instanceof StorageDriver) {
					currentDriver.setLogger(sinonLoggerSpy);
					currentDriver.setLogMapping(unitTestLogMap);
				}
				currentDriver.on('init', onInitSpy);
				currentDriver.on('hydrate', onHydrateSpy);
				currentDriver.on('store', onStoreSpy);
				currentDriver.on('clear', onClearSpy);
				currentDriver.on('unload', onUnloadSpy);
				currentDriver.on('update', (data) => {
					expect(data).to.be.eql(data);
				});
				await currentDriver.clear();
				expect(currentDriver.isInitialized).to.be.eq(false);
				expect(onUpdateRegisterSpy.callCount).to.be.eq(driverSet.size);
			});
			it('should be empty store', async () => {
				await expect(currentDriver.hydrate()).to.be.eventually.eq(undefined);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(2, 2, 0, 0, 0);
				expect(onUpdateEmitterSpy.callCount).to.be.eq(0);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(2);
			});
			it('should store to storage driver', async () => {
				await currentDriver.store(data);
				await expect(currentDriver.hydrate()).to.be.eventually.eql(data);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(0, 2, 2, 0, 0);
				expect(onUpdateEmitterSpy.callCount).to.be.eq(1);
				expect(sinonLoggerSpy.debug.callCount).to.be.greaterThanOrEqual(3);
			});
			it('should restore data from storage driver', async () => {
				await expect(currentDriver.hydrate()).to.be.eventually.eql(data);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(0, 2, 0, 0, 0);
				expect(onUpdateEmitterSpy.callCount).to.be.eq(0);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(1);
			});
			it('should clear to storage driver', async () => {
				await currentDriver.clear();
				expect(currentDriver.isInitialized).to.be.eq(false);
				await expect(currentDriver.hydrate()).to.be.eventually.eq(undefined);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(2, 2, 0, 2, 0);
				expect(onUpdateEmitterSpy.callCount).to.be.eq(1);
				expect(sinonLoggerSpy.debug.callCount).to.be.greaterThanOrEqual(4);
			});
			it('should unload driver', async () => {
				expect(currentDriver.isInitialized).to.be.eq(true);
				await expect(currentDriver.unload()).to.be.eventually.eq(true);
				expect(currentDriver.isInitialized).to.be.eq(false);
				expectEmitSpy(0, 0, 0, 0, 2);
				expect(sinonLoggerSpy.debug.callCount).to.be.eq(1);
			});
			it('should give undefined if not valid data', async () => {
				await currentDriver.store('ASD' as any);
				await expect(currentDriver.hydrate()).to.be.eventually.eq(undefined);
				expect(sinonLoggerSpy.debug.callCount).to.be.greaterThanOrEqual(5);
			});
			it('should throw error when strict validation', async () => {
				await currentDriver.store('ASD' as any);
				await expect(currentDriver.hydrate({validationThrowsError: true})).to.eventually.be.rejectedWith(Error);
				expect(sinonLoggerSpy.debug.callCount).to.be.greaterThanOrEqual(3);
			});
			it('should clone input data', async () => {
				expect(currentDriver.clone(data)).to.be.eql(data);
			});
			it('should get processor result', async () => {
				const processor = await currentDriver.getProcessorResult();
				expect(processor.isOk).to.be.eq(true);
			});
			it('should toString()', async () => {
				expect(currentDriver.toString()).to.be.string;
			});
			it('should toJSON()', async () => {
				expect(currentDriver.toJSON()).to.be.eql({
					name: currentDriver.name,
					bandwidth: currentDriver.bandwidth,
					processor: (await currentDriver.getProcessor())?.name,
					serializer: currentDriver.getSerializer().name,
				});
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
});
