import {RESP_TYPES, type RedisClientType, type RedisFunctions, type RedisModules, type RedisScripts, type RespVersions} from '@redis/client';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, type StorageDriverOptions, TachyonBandwidth} from 'tachyon-drive';

export type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts, RespVersions, {[RESP_TYPES.BLOB_STRING]: BufferConstructor}>;

export type RedisClientInstance = Pick<RedisClient, 'hSet' | 'hGet' | 'hDel' | 'quit'>;

export type RedisStorageDriverOptions = StorageDriverOptions & {
	key: string;
	redis: RedisClientInstance;
};

export class RedisStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	readonly #redis: RedisClientInstance;
	readonly #key: string;

	/**
	 * RedisStorageDriver constructor
	 * @param options - redis client options (name, key, logger, bandwidth, redis)
	 * @param serializer - tachyon serializer to use
	 * @param extNotify - optional external notify service to notify store update events
	 * @param processor - tachyon processor to use (default: undefined)
	 */
	public constructor(
		options: RedisStorageDriverOptions,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
	) {
		super(options, serializer, extNotify ?? null, processor);
		this.#key = options.key;
		this.#redis = options.redis;
	}

	protected handleInit(): boolean {
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await this.#redis.hSet(this.#key, 'value', buffer);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		const data = await this.#redis.hGet(this.#key, 'value');
		return data ?? undefined;
	}

	protected async handleClear(): Promise<void> {
		await this.#redis.hDel(this.#key, 'value');
	}

	protected handleUnload(): boolean {
		return true;
	}

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.Normal;
	}
}
