import type {ILoggerLike} from '@avanio/logger-like';
import {RESP_TYPES, type RedisClientType, type RedisFunctions, type RedisModules, type RedisScripts, type RespVersions} from '@redis/client';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';

export type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts, RespVersions, {[RESP_TYPES.BLOB_STRING]: BufferConstructor}>;

export type RedisStorageDriverOptions = {logger?: ILoggerLike; TachyonBandwidth?: TachyonBandwidth; redis: RedisClient};

export class RedisStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	private readonly redis: RedisClient;
	private key: string;

	/**
	 * RedisStorageDriver constructor
	 * @param name - name of the driver
	 * @param key - key to use for storage
	 * @param options - redis client options
	 * @param serializer - tachyon serializer to use
	 * @param extNotify - optional external notify service to notify store update events
	 * @param processor - tachyon processor to use (default: undefined)
	 * @param opts - options to use
	 */
	public constructor(
		name: string,
		key: string,
		serializer: IPersistSerializer<Input, Buffer>,
		opts: RedisStorageDriverOptions,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
	) {
		super(name, serializer, extNotify ?? null, processor, opts?.logger);
		this.key = key;
		this.bandwidth = opts.TachyonBandwidth ?? TachyonBandwidth.Normal;
		this.redis = opts.redis;
	}

	protected handleInit(): boolean {
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await this.redis.hSet(this.key, 'value', buffer);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		const data = await this.redis.hGet(this.key, 'value');
		return data ?? undefined;
	}

	protected async handleClear(): Promise<void> {
		await this.redis.hDel(this.key, 'value');
	}

	protected handleUnload(): boolean {
		return true;
	}
}
