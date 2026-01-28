import {type ILoggerLike, type ISetOptionalLogger, MapLogger} from '@avanio/logger-like';
import EventEmitter from 'events';
import type {IStorageDriver} from 'tachyon-drive';
import {defaultQuantumCoreLogLevels, type QuantumCoreLogMap} from './QuantumCoreLogMapping.mjs';

export type QuantumCoreEventsMap = {
	hydrate: [];
};

export interface QuantumCoreOptions {
	/**
	 * hide sensitive cache keys from logging
	 */
	hideKey?: boolean;
	logger?: ILoggerLike;
	logMapping?: Partial<QuantumCoreLogMap>;
}

export abstract class QuantumCore<TStore> extends EventEmitter<QuantumCoreEventsMap> implements ISetOptionalLogger {
	public abstract readonly name: string;
	private isInitialized = false;
	private readonly driver: IStorageDriver<TStore>;
	protected data: TStore;
	private readonly initialData: TStore;
	protected logger: MapLogger<QuantumCoreLogMap>;
	protected readonly options: QuantumCoreOptions;

	public constructor(driver: IStorageDriver<TStore>, initialData: TStore, options: QuantumCoreOptions = {}) {
		super();
		this.driver = driver;
		this.initialData = initialData;
		this.data = this.driver.clone(this.initialData);
		this.driver.on('update', this.onUpdateCallback.bind(this)); // hook into the driver to update the data when it changes
		this.logger = new MapLogger(options.logger, Object.assign({}, defaultQuantumCoreLogLevels, options.logMapping));
		this.options = options;
		this.logger.logKey('constructor', `QuantumCore: constructor()`);
	}

	/**
	 * Set the logger
	 * @param logger - the logger to use
	 */
	public setLogger(logger: ILoggerLike | undefined): void {
		this.logger.setLogger(logger);
	}

	/**
	 * Change log levels for the storage driver.
	 * @param map - The log key mapping to use for logging messages.
	 */
	public setLogMapping(map: Partial<QuantumCoreLogMap>): void {
		this.logger.setLogMapping(map);
	}

	public toString(): string {
		return `${this.name}(driver: ${this.driver.toString()})`;
	}

	/**
	 * Initialize the storage driver and hydrate the data if it exists
	 */
	protected async coreInit(): Promise<void> {
		this.logger.logKey('init', `QuantumCore: coreInit()`);
		if (!this.isInitialized) {
			await this.driver.init();
			const data = await this.driver.hydrate();
			if (data) {
				this.data = data;
			}
			this.isInitialized = true;
			if (data) {
				// call all the onHydrate callbacks
				this.emit('hydrate');
			}
		}
	}

	/**
	 * Store the current data to the storage driver
	 */
	protected async coreStore(): Promise<void> {
		this.logger.logKey('store', `QuantumCore: coreStore()`);
		await this.driver.store(this.data);
	}

	/**
	 * Reset data to initial and clear the storage driver
	 */
	protected async coreClear(): Promise<void> {
		this.logger.logKey('clear', `QuantumCore: coreClear()`);
		this.data = this.driver.clone(this.initialData);
		await this.driver.clear();
		this.isInitialized = false;
		// notify all the onHydrate callbacks about data changes
		this.emit('hydrate');
	}

	private onUpdateCallback(data: TStore | undefined): void {
		this.logger.logKey('driver_update_event', `QuantumCore: onUpdateCallback()`);
		this.data = data ?? this.driver.clone(this.initialData);
		// notify all the onHydrate callbacks about data changes
		this.emit('hydrate');
	}
}
