import {existsSync} from 'fs';
import {readFile, writeFile} from 'fs/promises';
import path from 'path';
import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {FileUpdateNotify} from '../src/index.js';

let notify: FileUpdateNotify;

const fileName = path.resolve(__dirname, './notify.file');

function sleepPromise(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const fileEventSpy = vi.fn();

describe('FileUpdateNotify', function () {
	beforeEach(function () {
		fileEventSpy.mockReset();
	});
	beforeAll(function () {
		notify = new FileUpdateNotify(() => fileName);
		notify.on('update', fileEventSpy);
	});
	it('should initialize notify service', async function () {
		await notify.init();
		expect((await readFile(fileName)).toString()).to.eql('0');
		expect(fileEventSpy.mock.calls.length).toStrictEqual(0);
	});
	it('should initialize notify service', async function () {
		await notify.notifyUpdate(new Date(10));
		expect((await readFile(fileName)).toString()).to.eql('10');
		expect(fileEventSpy.mock.calls.length).toStrictEqual(0); // no self notification
	});
	it('should notify when externally changed', async function () {
		await writeFile(fileName, '20');
		await sleepPromise(200);
		expect(fileEventSpy.mock.calls.length).toStrictEqual(1);
		expect(fileEventSpy.mock.calls[0][0]).toStrictEqual(new Date(20));
	});
	it('should be valid processor', async function () {
		await notify.unload();
		expect(existsSync(fileName)).to.be.equal(false);
		await notify.unload(); // should not throw
	});
	it('should get toString()', function () {
		expect(notify.toString()).to.be.equal(`FileUpdateNotify: fileName: ${fileName}`);
		expect(() => new FileUpdateNotify(() => fileName).toString(), 'not initialized yet').to.throw(Error, 'not initialized yet');
	});
	it('should get toJSON()', function () {
		expect(notify.toJSON()).toStrictEqual({fileName, updated: 20});
		expect(() => new FileUpdateNotify(() => fileName).toJSON(), 'not initialized yet').to.throw(Error, 'not initialized yet');
	});
});
