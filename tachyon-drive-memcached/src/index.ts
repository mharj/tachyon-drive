import {type ILoggerLike} from '@avanio/logger-like';
import {type Loadable, resolveLoadable} from '@luolapeikko/ts-common';
import Memcached from 'memcached';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';
import {mcGet, mcRemove, mcSet, mcTouch} from './memcacheUtils';

type ClientOptions = {logger?: ILoggerLike; TachyonBandwidth?: TachyonBandwidth};

export class MemcachedStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	private urls: Loadable<URL[]>;
	private memcached: Memcached | undefined;
	private options: Memcached.options | undefined;
	private key: string;
	private lifetime: number;

	/**
	 * MemcachedStorageDriver constructor
	 * @param name - name of the driver
	 * @param key - key to use for storage
	 * @param lifetime - lifetime of the key in seconds (use large values here)
	 * @param serializer - tachyon serializer to use
	 * @param urls - memcached urls to connect to (default: [new URL('http://localhost:11211')]
	 * @param options - memcached options (default: undefined)
	 * @param processor - tachyon processor to use (default: undefined)
	 * @param logger - logger to use (default: undefined)
	 */
	constructor(
		name: string,
		key: string,
		lifetime: number,
		serializer: IPersistSerializer<Input, Buffer>,
		urls: Loadable<URL[]> = [new URL('memcached://localhost:11211')],
		extNotify?: IExternalNotify,
		options?: Memcached.options,
		processor?: IStoreProcessor<Buffer>,
		opts?: ClientOptions,
	) {
		super(name, serializer, extNotify ?? null, processor, opts?.logger);
		this.urls = urls;
		this.options = options;
		this.key = key;
		this.lifetime = lifetime;
		this.bandwidth = opts?.TachyonBandwidth ?? TachyonBandwidth.Normal;
	}

	protected async handleInit(): Promise<boolean> {
		await this.getMemcached();
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await mcSet(this.getMemcached(), this.key, buffer, this.lifetime);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		const data = await mcGet(this.getMemcached(), this.key);
		if (data) {
			// update TTL on read
			await mcTouch(this.getMemcached(), this.key, this.lifetime);
		}
		return data;
	}

	protected handleClear(): Promise<void> {
		return mcRemove(this.getMemcached(), this.key);
	}

	protected handleUnload(): boolean {
		this.memcached = undefined;
		return true;
	}

	private getUrls(): URL[] | Promise<URL[]> {
		return resolveLoadable(this.urls);
	}

	private async getMemcached(): Promise<Memcached> {
		if (!this.memcached) {
			const urls = (await this.getUrls()).map((url) => `${url.hostname}:${url.port}`);
			this.logger?.info(`Memcached connecting to [${urls.join(', ')}])}]`);
			this.memcached = new Memcached(urls, this.options);
			// log all events
			/* c8 ignore next 2 */
			this.memcached.on('failure', (details) => {
				this.logger?.info('Memcached failure', details);
			});
			/* c8 ignore next 2 */
			this.memcached.on('issue', (details) => {
				this.logger?.info('Memcached issue', details);
			});
			/* c8 ignore next 2 */
			this.memcached.on('reconnect', (details) => {
				this.logger?.info('Memcached reconnect', details);
			});
			/* c8 ignore next 2 */
			this.memcached.on('reconnecting', (details) => {
				this.logger?.info('Memcached reconnecting', details);
			});
			/* c8 ignore next 2 */
			this.memcached.on('remove', (details) => {
				this.logger?.info('Memcached remove', details);
			});
		}
		return this.memcached;
	}
}
