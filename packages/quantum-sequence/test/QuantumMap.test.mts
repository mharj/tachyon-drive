import {type ILoggerLike, LogLevel} from '@avanio/logger-like';
import {type IPersistSerializer, MemoryStorageDriver} from 'tachyon-drive';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {QuantumMap} from '../src/index.mjs';

const dataSchema = z.object({
	test: z.string(),
});

const mapDataSchema = z.map(z.string(), dataSchema);

type Data = z.infer<typeof dataSchema>;

const bufferSerializer: IPersistSerializer<Map<string, Data>, Buffer> = {
	deserialize: (buffer: Buffer) => new Map(JSON.parse(buffer.toString())),
	name: 'BufferSerializer',
	serialize: (data: Map<string, Data>) => Buffer.from(JSON.stringify(Array.from(data))),
	validator: (data: Map<string, Data>) => mapDataSchema.safeParse(data).success,
};

const debugSpy = vi.fn();
const errorSpy = vi.fn();
const warnSpy = vi.fn();
const infoSpy = vi.fn();

const spyLogger: ILoggerLike = {
	debug: debugSpy,
	error: errorSpy,
	info: infoSpy,
	warn: warnSpy,
};

const debugLogMapping = {
	clear: LogLevel.Debug,
	deserialize: LogLevel.Debug,
	driver_update_event: LogLevel.Debug,
	hydrate: LogLevel.Debug,
	init: LogLevel.Debug,
	store: LogLevel.Debug,
	unload: LogLevel.Debug,
	update: LogLevel.Debug,
	validator: LogLevel.Debug,
};

let driver: MemoryStorageDriver<Map<string, {test: string}>, Buffer>;
let map: QuantumMap<string, Data>;

describe('QuantumMap', () => {
	beforeEach(() => {
		debugSpy.mockClear();
		errorSpy.mockClear();
		warnSpy.mockClear();
		infoSpy.mockClear();
	});
	it('should create a new instance', async () => {
		driver = new MemoryStorageDriver({logger: spyLogger, name: 'MemoryStorageDriver'}, bufferSerializer, null);
		driver.logger.setLogMapping(debugLogMapping);
		map = new QuantumMap<string, Data>(driver, {
			logger: spyLogger,
			logMapping: {
				clear: LogLevel.Debug,
				constructor: LogLevel.Debug,
				driver_update_event: LogLevel.Debug,
				init: LogLevel.Debug,
				notify_hydrate: LogLevel.Debug,
				register_hydrate_callback: LogLevel.Debug,
				store: LogLevel.Debug,
			},
		});
		await map.init();
		expect(debugSpy.mock.calls.length).to.be.equal(4);
		expect(debugSpy.mock.calls[0][0]).to.be.equal('QuantumCore: constructor()');
		expect(debugSpy.mock.calls[1][0]).to.be.equal('QuantumCore: coreInit()');
		expect(debugSpy.mock.calls[2][0]).to.be.equal('MemoryStorageDriver: init()');
		expect(debugSpy.mock.calls[3][0]).to.be.equal('MemoryStorageDriver: hydrate()');
	});
	it('should set a value', async () => {
		await map.set('key1', {test: 'test'});
	});
	it('should get a value', async () => {
		map = new QuantumMap<string, Data>(driver); // we should hydrate the map from the driver
		const value = await map.get('key1');
		expect(value).to.deep.equal({test: 'test'});
		await expect(map.size()).resolves.toEqual(1);
	});
	it('should have a value', async () => {
		await expect(map.has('key1')).resolves.toEqual(true);
	});
	it('should get all iterator values', async () => {
		expect(Array.from(await map.entries())).to.be.deep.equal([['key1', {test: 'test'}]]);
		expect(Array.from(await map.keys())).to.be.deep.equal(['key1']);
		expect(Array.from(await map.values())).to.be.deep.equal([{test: 'test'}]);
	});
	it('should delete a array value', async () => {
		await map.delete(['key1', 'key2']);
		const value = await map.get('key1');
		expect(value).to.be.equal(undefined);
		await expect(map.size()).resolves.toEqual(0);
	});
	it('should delete a value', async () => {
		await map.set('key1', {test: 'test'});
		await map.delete('key1');
		const value = await map.get('key1');
		expect(value).to.be.equal(undefined);
		await expect(map.size()).resolves.toEqual(0);
	});
	it('should clear values', async () => {
		await map.set('key1', {test: 'test'});
		await map.clear();
		await expect(map.size()).resolves.toEqual(0);
	});
	it('should get toString()', function () {
		expect(map.toString()).to.satisfies((value: string) => value.startsWith('QuantumMap('));
	});
});
