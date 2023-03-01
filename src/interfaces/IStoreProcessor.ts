export interface IStoreProcessor<Output> {
	/**
	 * Pre-process the data before store.
	 */
	preStore(data: Output): Promise<Output>;
	/**
	 * Post-process the data after hydrate.
	 */
	postHydrate(data: Output): Promise<Output>;
}
