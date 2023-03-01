export * from './drivers/MemoryStorageDriver';
export * from './drivers/StorageDriver';
export * from './interfaces/IStoreProcessor';
export * from './interfaces/IPersistSerializer';
export * from './interfaces/ILoggerLike';

export type OnUpdateCallback<Input> = (data: Input | undefined) => void;

export interface IStorageDriver<Input> {
	readonly isInitialized: boolean;
	readonly name: string;
	init(): Promise<boolean>;
	store(data: Input): Promise<void>;
	hydrate(): Promise<Input | undefined>;
	clear(): Promise<void>;
	clone(data: Input): Input;
	onUpdate(callback: OnUpdateCallback<Input>): void;
}
