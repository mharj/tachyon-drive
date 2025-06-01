import {type ILoggerLike} from '@avanio/logger-like';
import {
	createClient,
	type RedisClientOptions,
	type RedisClientType,
	type RedisFunctions,
	type RedisModules,
	type RedisScripts,
	RESP_TYPES,
	type RespVersions,
} from '@redis/client';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';

type RedisOptions = RedisClientOptions<RedisModules, RedisFunctions, RedisScripts>;
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts, RespVersions, {[RESP_TYPES.BLOB_STRING]: BufferConstructor}>;

type RedisOptionsOrProvider = RedisOptions | Promise<RedisOptions> | (() => RedisOptions | Promise<RedisOptions>);

type ClientOptions = {logger?: ILoggerLike; TachyonBandwidth?: TachyonBandwidth};

export class RedisStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	private options: RedisOptionsOrProvider;
	private redis: RedisClient | undefined;
	private key: string;

	/**
	 * RedisStorageDriver constructor
	 * @param name - name of the driver
	 * @param key - key to use for storage
	 * @param options - redis client options
	 * @param serializer - tachyon serializer to use
	 * @param extNotify - optional external notify service to notify store update events
	 * @param processor - tachyon processor to use (default: undefined)
	 * @param logger - logger to use (default: undefined)
	 */
	constructor(
		name: string,
		key: string,
		options: RedisOptionsOrProvider,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
		opts?: ClientOptions,
	) {
		super(name, serializer, extNotify ?? null, processor, opts?.logger);
		this.options = options;
		this.key = key;
		this.bandwidth = opts?.TachyonBandwidth ?? TachyonBandwidth.Normal;
	}

	protected async handleInit(): Promise<boolean> {
		return Boolean(await this.getDriver());
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await (await this.getDriver()).hSet(this.key, 'value', buffer);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		const data = await (await this.getDriver()).hGet(this.key, 'value');
		return data ?? undefined;
	}

	protected async handleClear(): Promise<void> {
		await (await this.getDriver()).del(this.key);
	}

	protected async handleUnload(): Promise<boolean> {
		if (this.redis) {
			await this.redis.quit();
			this.redis = undefined;
		}
		return true;
	}

	/**
	 * build the redis driver and connect if not already connected
	 */
	private async getDriver(): Promise<RedisClient> {
		if (!this.redis) {
			this.redis = createClient(await this.getOptions()).withTypeMapping({
				[RESP_TYPES.BLOB_STRING]: Buffer,
			});
			await this.redis.connect();
		}
		return this.redis;
	}

	/**
	 * get the redis options to use for the driver
	 */
	private getOptions(): RedisOptions | Promise<RedisOptions> {
		return typeof this.options === 'function' ? this.options() : this.options;
	}
}
