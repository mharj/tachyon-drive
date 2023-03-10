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

export function isValidStoreProcessor<Output>(value: unknown): value is IStoreProcessor<Output> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'preStore' in value &&
		typeof value.preStore === 'function' &&
		'postHydrate' in value &&
		typeof value.postHydrate === 'function'
	);
}
