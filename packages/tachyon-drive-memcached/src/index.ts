import {type Loadable, LoadableCore} from '@luolapeikko/ts-common';
import type Memcached from 'memcached';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, type StorageDriverOptions, TachyonBandwidth} from 'tachyon-drive';
import {mcGet, mcRemove, mcSet, mcTouch} from './memcacheUtils';

export type MemcachedStorageDriverOptions = StorageDriverOptions & {
	memcached: Loadable<Memcached>;
	key: string;
	lifetime: number;
};

export class MemcachedStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	#memcached: Loadable<Memcached>;
	#key: string;
	#lifetime: number;

	/**
	 * MemcachedStorageDriver constructor
	 * @param options - options to use
	 * @param serializer - tachyon serializer to use
	 * @param extNotify - external notify to use (default: undefined)
	 * @param processor - processor to use (default: undefined)
	 */
	public constructor(
		options: MemcachedStorageDriverOptions,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
	) {
		super(options, serializer, extNotify ?? null, processor);
		this.#memcached = options.memcached;
		this.#key = options.key;
		this.#lifetime = options.lifetime;
	}

	protected async handleInit(): Promise<boolean> {
		await this.#getMemcached();
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await mcSet(this.#getMemcached(), this.#key, buffer, this.#lifetime);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		const data = await mcGet(this.#getMemcached(), this.#key);
		if (data) {
			// update TTL on read
			await mcTouch(this.#getMemcached(), this.#key, this.#lifetime);
		}
		return data;
	}

	protected handleClear(): Promise<void> {
		return mcRemove(this.#getMemcached(), this.#key);
	}

	protected handleUnload(): boolean {
		return true;
	}

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.Normal;
	}

	async #getMemcached(): Promise<Memcached> {
		return await LoadableCore.resolve(this.#memcached);
	}
}
