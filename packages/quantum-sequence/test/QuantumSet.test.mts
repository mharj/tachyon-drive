import {type IPersistSerializer, MemoryStorageDriver} from 'tachyon-drive';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {QuantumSet} from '../src/index.mjs';

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

let set: QuantumSet<Data>;

const data: Data = {date: new Date(1677844069703)};

describe('QuantumSet', () => {
	it('should create a new instance', async () => {
		set = new QuantumSet<Data>(driver);
		await set.init();
	});
	it('should add a value', async () => {
		await set.add(data);
	});
	it('should have a value', async () => {
		set = new QuantumSet<Data>(driver); // we should hydrate the set from the driver
		// lookup rehydrated value by date
		const hydratedValue = Array.from(await set.values()).find((value) => value.date.getTime() === data.date.getTime());
		expect(hydratedValue).to.deep.equal(data);
		if (!hydratedValue) {
			throw new Error('Value not found');
		}
		await expect(set.has(hydratedValue)).resolves.toEqual(true);
		await expect(set.size()).resolves.toEqual(1);
		expect(Array.from(await set.values())).to.be.deep.equal([data]);
	});
	it('should delete a value', async () => {
		const restoreData = Array.from(await set.values())[0];
		await set.delete(restoreData);
		await expect(set.size()).resolves.toEqual(0);
	});
	it('should delete a value array', async () => {
		await set.add(data);
		const restoreData = Array.from(await set.values())[0];
		await set.delete([restoreData]);
		await expect(set.size()).resolves.toEqual(0);
	});
	it('should clear values', async () => {
		await set.add(data);
		await set.clear();
		await expect(set.size()).resolves.toEqual(0);
	});
});
