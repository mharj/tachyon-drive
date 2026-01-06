import type {ILoggerLike} from '@avanio/logger-like';
import {type Loadable, LoadableCore} from '@luolapeikko/ts-common';
import type Memcached from 'memcached';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';
import {mcGet, mcRemove, mcSet, mcTouch} from './memcacheUtils';

export type MemcachedStorageDriverOptions = {logger?: ILoggerLike; TachyonBandwidth?: TachyonBandwidth};

export class MemcachedStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	#memcached: Loadable<Memcached>;
	#key: string;
	#lifetime: number;

	/**
	 * MemcachedStorageDriver constructor
	 * @param name - name of the driver
	 * @param key - key to use for storage
	 * @param lifetime - lifetime of the key in seconds or 0 for infinite
	 * @param memcached - memcached instance to use
	 * @param serializer - tachyon serializer to use
	 * @param processor - tachyon processor to use (default: undefined)
	 * @param opts - options to use
	 */
	public constructor(
		name: string,
		key: string,
		lifetime: number,
		memcached: Loadable<Memcached>,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
		opts?: MemcachedStorageDriverOptions,
	) {
		super(name, serializer, extNotify ?? null, processor, opts?.logger);
		this.#memcached = memcached;
		this.#key = key;
		this.#lifetime = lifetime;
		this.bandwidth = opts?.TachyonBandwidth ?? TachyonBandwidth.Normal;
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

	async #getMemcached(): Promise<Memcached> {
		return await LoadableCore.resolve(this.#memcached);
	}
}
