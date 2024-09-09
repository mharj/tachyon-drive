/* eslint-disable @typescript-eslint/require-await */
import 'mocha';
import {type IStoreProcessor, isValidStoreProcessor} from '../src/index.js';
import chai from 'chai';

const expect = chai.expect;

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
		expect(isValidStoreProcessor(asyncProcessor)).to.be.eq(true);
		expect(isValidStoreProcessor(promiseProcessor)).to.be.eq(true);
	});
});
