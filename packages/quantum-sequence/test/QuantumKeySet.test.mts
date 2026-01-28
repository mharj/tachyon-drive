import {type IPersistSerializer, MemoryStorageDriver} from 'tachyon-drive';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {QuantumKeySet} from '../src/index.mjs';

const dataSchema = z.object({
	date: z.coerce.date(),
});

const setDataSchema = z.set(dataSchema);

type Data = z.infer<typeof dataSchema>;

const bufferSerializer: IPersistSerializer<Set<Data>, Buffer> = {
	deserialize: (buffer: Buffer) => new Set(z.array(dataSchema).parse(JSON.parse(buffer.toString()))),
	name: 'BufferSerializer',
	serialize: (data: Set<Data>) => Buffer.from(JSON.stringify(Array.from(data))),
	validator: (data: Set<Data>) => setDataSchema.safeParse(data).success,
};

const driver = new MemoryStorageDriver({name: 'MemoryStorageDriver'}, bufferSerializer, null);

let set: QuantumKeySet<Data, 'date'>;

const ts = 1677844069703;

describe('QuantumKeySet', () => {
	it('should create and set empty logging', function () {
		set = new QuantumKeySet<Data, 'date'>({lookupKey: 'date', lookupValueBuilder: (value) => value.getTime()}, driver);
		driver.emit('update', undefined); // this calls QuantumCore.onUpdateCallback to re-initialize the set
		set.setLogger(undefined);
		set.setLogMapping({});
	});
	it('should create a new instance', async () => {
		await set.init();
	});
	it('should set a value', async () => {
		await set.set(new Date(ts), {date: new Date(ts)});
		await set.set(new Date(ts), {date: new Date(ts)}); // should not throw
	});
	it('should get a value', async () => {
		set = new QuantumKeySet<Data, 'date'>({lookupKey: 'date', lookupValueBuilder: (value) => value.getTime()}, driver); // we should hydrate the set from the driver
		const value = await set.get(new Date(ts));
		expect(value).to.deep.equal({date: new Date(ts)});
		await expect(set.size()).resolves.toEqual(1);
		expect(Array.from(await set.values())).to.be.deep.equal([{date: new Date(ts)}]);
	});
	it('should have a value', async () => {
		await expect(set.has(new Date(ts))).resolves.toEqual(true);
	});
	it('should get all iterator values', async () => {
		expect(Array.from(await set.entries())).to.be.deep.equal([[new Date(ts), {date: new Date(ts)}]]);
		expect(Array.from(await set.keys())).to.be.deep.equal([new Date(ts)]);
		expect(Array.from(await set.values())).to.be.deep.equal([{date: new Date(ts)}]);
	});
	it('should delete a value', async () => {
		await set.delete([new Date(ts), new Date(ts)]);
		const value = await set.get(new Date(ts));
		expect(value).to.be.equal(undefined);
		await expect(set.size()).resolves.toEqual(0);
	});
	it('should clear values', async () => {
		await set.set(new Date(ts), {date: new Date(ts)});
		await set.clear();
		await expect(set.size()).resolves.toEqual(0);
	});
});
