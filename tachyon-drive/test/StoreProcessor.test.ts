/* eslint-disable @typescript-eslint/require-await */
import {describe, expect, it} from 'vitest';
import {type IStoreProcessor, isValidStoreProcessor} from '../src/index.js';

const asyncProcessor: IStoreProcessor<string> = {
	name: 'AsyncProcessor',
	preStore: async (data) => data,
	postHydrate: async (data) => data,
};

const promiseProcessor: IStoreProcessor<string> = {
	name: 'PromiseProcessor',
	preStore: (data) => Promise.resolve(data),
	postHydrate: (data) => Promise.resolve(data),
};

describe('IStoreProcessor', () => {
	it('should be valid Store Processor', async () => {
		expect(isValidStoreProcessor(asyncProcessor)).equals(true);
		expect(isValidStoreProcessor(promiseProcessor)).equals(true);
	});
});
