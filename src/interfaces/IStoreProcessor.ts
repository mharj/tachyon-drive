import {isPromiseFunction} from '../lib/promiseUtils';

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
		isPromiseFunction(value.preStore) &&
		'postHydrate' in value &&
		isPromiseFunction(value.postHydrate)
	);
}
