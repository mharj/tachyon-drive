export interface IStoreProcessor<Output> {
	preStore(buffer: Output): Promise<Output>;
	postHydrate(buffer: Output): Promise<Output>;
}
