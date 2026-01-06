import {ErrorCore} from '@luolapeikko/ts-common';
import type Memcached from 'memcached';

export async function mcSet(memcache: Memcached | Promise<Memcached>, key: string, buffer: Buffer, lifetime: number): Promise<void> {
	const mc = await memcache;
	return new Promise((resolve, reject) => {
		mc.set(key, buffer, lifetime, (err) => {
			/* c8 ignore next 2 */
			if (err) {
				reject(ErrorCore.from(err));
			} else {
				resolve();
			}
		});
	});
}

export async function mcGet(memcache: Memcached | Promise<Memcached>, key: string): Promise<Buffer | undefined> {
	const mc = await memcache;
	return new Promise((resolve, reject) => {
		mc.get(key, (err, data: string | Buffer | undefined) => {
			/* c8 ignore next 2 */
			if (err) {
				reject(ErrorCore.from(err));
			} else {
				resolve(typeof data === 'string' ? Buffer.from(data) : data);
			}
		});
	});
}

export async function mcTouch(memcache: Memcached | Promise<Memcached>, key: string, lifetime: number): Promise<void> {
	const mc = await memcache;
	return new Promise((resolve, reject) => {
		mc.touch(key, lifetime, (err) => {
			/* c8 ignore next 2 */
			if (err) {
				reject(ErrorCore.from(err));
			} else {
				resolve(undefined);
			}
		});
	});
}

export async function mcRemove(memcache: Memcached | Promise<Memcached>, key: string): Promise<void> {
	const mc = await memcache;
	return new Promise((resolve, reject) => {
		mc.del(key, (err) => {
			/* c8 ignore next 2 */
			if (err) {
				reject(ErrorCore.from(err));
			} else {
				resolve(undefined);
			}
		});
	});
}
