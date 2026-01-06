import type {ILoggerLike} from '@avanio/logger-like';
import {type Loadable, LoadableCore} from '@luolapeikko/ts-common';
import {type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';

export type CacheStorageDriverOptions = {
	/** Cache Store name, defaults as 'tachyon' */
	cache: Loadable<Cache>;
	/** Cache Request url */
	url: Loadable<URL>;
};
/**
 * CacheStorageDriver
 * @example
 * const stringSerializer: IPersistSerializer<DemoData, string> = { ... };
 * export const cacheStoreDriver = new CacheStorageDriver('CacheStorageDriver', {url: new URL('http://tachyon')}, stringSerializer);
 * @since v0.3.0
 */
export class CacheStorageDriver<Input, Output extends ArrayBuffer | string> extends StorageDriver<Input, Output> {
	public readonly bandwidth: TachyonBandwidth = TachyonBandwidth.Large;
	#cache: Loadable<Cache>;
	#req: Loadable<URL>;
	/**
	 * CacheStorageDriver constructor
	 * @param {string} name Driver name
	 * @param {CacheStorageDriverOptions} options CacheStorageDriver options which can be a value, promise or a function
	 * @param {IPersistSerializer<Input, Output>} serializer Serializer object for the data, this can be string or ArrayBuffer serializer
	 * @param {IStoreProcessor<Output>} processor optional Processor which can be used to modify the data before storing or after hydrating
	 * @param {ILoggerLike} logger optional logger
	 */
	public constructor(
		name: string,
		options: CacheStorageDriverOptions,
		serializer: IPersistSerializer<Input, Output>,
		processor?: Loadable<IStoreProcessor<Output>>,
		logger?: ILoggerLike,
	) {
		super(name, serializer, null, processor, logger);
		this.#cache = options.cache;
		this.#req = options.url;
	}

	protected async handleInit(): Promise<boolean> {
		await this.getCurrentCache();
		return true;
	}

	protected async handleStore(buffer: Output): Promise<void> {
		let size: number;
		let contentType: string;
		if (typeof buffer === 'string') {
			size = buffer.length;
			contentType = 'text/plain';
		} else {
			size = buffer.byteLength;
			contentType = 'application/octet-stream';
		}
		const cache = await this.getCurrentCache();
		const request = await this.getRequest();
		await cache.put(
			request,
			new Response(buffer, {
				headers: {
					'Content-Length': size.toString(),
					'Content-Type': contentType,
				},
			}),
		);
		this.logger.debug(`${this.name}: Stored ${size.toString()} bytes as '${contentType}'`);
	}

	protected async handleHydrate(): Promise<Output | undefined> {
		const cache = await this.getCurrentCache();
		const res = await cache.match(await this.getRequest());
		if (res) {
			const contentType = res.headers.get('Content-Type');
			let data: Output;
			switch (contentType) {
				case 'application/octet-stream': {
					data = (await res.clone().arrayBuffer()) as Output;
					break;
				}
				case 'text/plain': {
					data = (await res.clone().text()) as Output;
					break;
				}
				/* c8 ignore next 2 */
				default:
					throw new Error('Content-Type header missing or wrong');
			}
			const size = typeof data === 'string' ? data.length : data.byteLength;
			this.logger.debug(`${this.name}: Read ${size.toString()} bytes as '${contentType}'`);
			return data;
		}
		return undefined;
	}

	protected async handleClear(): Promise<void> {
		const cache = await this.getCurrentCache();
		await cache.delete(await this.getRequest());
	}

	protected handleUnload() {
		return true;
	}

	private async getRequest(): Promise<Request> {
		if (typeof this.#req === 'function') {
			this.#req = LoadableCore.resolve(this.#req);
		}
		return new Request(await this.#req);
	}

	private async getCurrentCache(): Promise<Cache> {
		if (typeof this.#cache === 'function') {
			this.#cache = LoadableCore.resolve(this.#cache);
		}
		return await this.#cache;
	}
}
