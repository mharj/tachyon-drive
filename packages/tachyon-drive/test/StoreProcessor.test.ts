import {describe, expect, it} from 'vitest';
import {type IStoreProcessor, isValidStoreProcessor} from '../src/index.js';

const asyncProcessor: IStoreProcessor<string> = {
	name: 'AsyncProcessor',
	postHydrate: async (data) => data,
	preStore: async (data) => data,
};

const promiseProcessor: IStoreProcessor<string> = {
	name: 'PromiseProcessor',
	postHydrate: (data) => Promise.resolve(data),
	preStore: (data) => Promise.resolve(data),
};

describe('IStoreProcessor', () => {
	it('should be valid Store Processor', () => {
		expect(isValidStoreProcessor(asyncProcessor)).equals(true);
		expect(isValidStoreProcessor(promiseProcessor)).equals(true);
	});
});
