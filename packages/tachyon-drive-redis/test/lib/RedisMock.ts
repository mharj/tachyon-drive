import type {RedisClient} from '../../src';

export class RedisMock {
	private storage = new Map<string, Map<string, Buffer>>();

	public hSet(key: string, field: string, value: Buffer): Promise<number> {
		let keyMap = this.storage.get(key);
		if (!keyMap) {
			keyMap = new Map();
			this.storage.set(key, keyMap);
		}
		keyMap.set(field, value);
		return Promise.resolve(1);
	}

	public hGet(key: string, field: string): Promise<Buffer | null> {
		return Promise.resolve(this.storage.get(key)?.get(field) ?? null);
	}

	public hDel(key: string): Promise<number> {
		return Promise.resolve(this.storage.delete(key) ? 1 : 0);
	}

	public quit(): Promise<string> {
		return Promise.resolve('OK');
	}
}

export function createClient(): RedisClient {
	return new RedisMock() as unknown as RedisClient;
}
