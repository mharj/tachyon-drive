/* eslint-disable jsdoc/require-param */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as zod from 'zod';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';
import 'mocha';
import {IStorageDriver, MemoryStorageDriver, IPersistSerializer, isValidPersistSerializer, IStoreProcessor} from '../src';

chai.use(chaiAsPromised);

const expect = chai.expect;

const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

const nullProcessor: IStoreProcessor<Data> = {
	preStore: async (data: Data) => data,
	postHydrate: async (data: Data) => data,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = {
	serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
	deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const objectSerializer: IPersistSerializer<Data, Data> = {
	serialize: (data: Data) => ({...data}),
	deserialize: (value: Data) => ({...value}),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const onInitSpy = sinon.spy();
const onHydrateSpy = sinon.spy();
const onStoreSpy = sinon.spy();
const onClearSpy = sinon.spy();
const onUnloadSpy = sinon.spy();

const memoryObjectDriver = new MemoryStorageDriver('MemoryStorageDriver - Object', objectSerializer, nullProcessor);
memoryObjectDriver.setData(undefined);

const driverSet = new Set<IStorageDriver<Data>>([memoryObjectDriver, new MemoryStorageDriver('MemoryStorageDriver - Buffer', bufferSerializer)]);

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
	driverSet.forEach((currentDriver) => {
		describe(currentDriver.name, () => {
			beforeEach(() => {
				onInitSpy.resetHistory();
				onHydrateSpy.resetHistory();
				onStoreSpy.resetHistory();
				onClearSpy.resetHistory();
				onUnloadSpy.resetHistory();
			});
			before(async () => {
				currentDriver.onInit(onInitSpy);
				currentDriver.onHydrate(onHydrateSpy);
				currentDriver.onStore(onStoreSpy);
				currentDriver.onClear(onClearSpy);
				currentDriver.onUnload(onUnloadSpy);
				currentDriver.onUpdate((data) => {
					expect(data).to.be.eql(data);
				});
				await currentDriver.clear();
				expect(currentDriver.isInitialized).to.be.eq(false);
			});
			it('should be empty store', async () => {
				await expect(currentDriver.hydrate()).to.be.eventually.eq(undefined);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(2, 2, 0, 0, 0);
			});
			it('should store to storage driver', async () => {
				await currentDriver.store(data);
				await expect(currentDriver.hydrate()).to.be.eventually.eql(data);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(0, 2, 2, 0, 0);
			});
			it('should restore data from storage driver', async () => {
				await expect(currentDriver.hydrate()).to.be.eventually.eql(data);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(0, 2, 0, 0, 0);
			});
			it('should clear to storage driver', async () => {
				await currentDriver.clear();
				expect(currentDriver.isInitialized).to.be.eq(false);
				await expect(currentDriver.hydrate()).to.be.eventually.eq(undefined);
				expect(currentDriver.isInitialized).to.be.eq(true);
				expectEmitSpy(2, 2, 0, 2, 0);
			});
			it('should unload driver', async () => {
				expect(currentDriver.isInitialized).to.be.eq(true);
				await expect(currentDriver.unload()).to.be.eventually.eq(true);
				expect(currentDriver.isInitialized).to.be.eq(false);
				expectEmitSpy(0, 0, 0, 0, 2);
			});
			it('should give undefined if not valid data', async () => {
				await currentDriver.store('ASD' as any);
				await expect(currentDriver.hydrate()).to.be.eventually.eq(undefined);
			});
			it('should throw error when strict validation', async () => {
				await currentDriver.store('ASD' as any);
				await expect(currentDriver.hydrate({validationThrowsError: true})).to.eventually.be.rejectedWith(Error);
			});
			it('should clone input data', async () => {
				expect(currentDriver.clone(data)).to.be.eql(data);
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
