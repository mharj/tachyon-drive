import * as zod from 'zod';
import * as chai from 'chai';
import 'mocha';
import {IStorageDriver, MemoryStorageDriver, IPersistSerializer} from '../src';

const expect = chai.expect;

const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

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

const driverSet = new Set<IStorageDriver<Data>>([
	new MemoryStorageDriver('MemoryStorageDriver - Object', objectSerializer),
	new MemoryStorageDriver('MemoryStorageDriver - Buffer', bufferSerializer),
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', () => {
	driverSet.forEach((currentDriver) => {
		describe(currentDriver.name, () => {
			before(async () => {
				await currentDriver.clear();
				expect(currentDriver.isInitialized).to.be.eq(false);
			});
			it('should be empty store', async () => {
				expect(await currentDriver.hydrate()).to.eq(undefined);
				expect(currentDriver.isInitialized).to.be.eq(true);
			});
			it('should store to storage driver', async () => {
				await currentDriver.store(data);
				expect(await currentDriver.hydrate()).to.eql(data);
				expect(currentDriver.isInitialized).to.be.eq(true);
			});
			it('should restore data from storage driver', async () => {
				expect(await currentDriver.hydrate()).to.eql(data);
				expect(currentDriver.isInitialized).to.be.eq(true);
			});
			it('should clear to storage driver', async () => {
				await currentDriver.clear();
				expect(currentDriver.isInitialized).to.be.eq(false);
				expect(await currentDriver.hydrate()).to.eq(undefined);
				expect(currentDriver.isInitialized).to.be.eq(true);
			});
		});
	});
});
