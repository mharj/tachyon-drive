/* eslint-disable no-unused-expressions */
import 'mocha';
import * as chai from 'chai';
import {IStoreProcessor, isValidStoreProcessor} from '../src';

const expect = chai.expect;

const asyncProcessor: IStoreProcessor<string> = {
	preStore: async (data) => data,
	postHydrate: async (data) => data,
};

const promiseProcessor: IStoreProcessor<string> = {
	preStore: (data) => Promise.resolve(data),
	postHydrate: (data) => Promise.resolve(data),
};

describe('IStoreProcessor', () => {
	it('should be valid Store Processor', async () => {
		expect(isValidStoreProcessor(asyncProcessor)).to.be.true;
		expect(isValidStoreProcessor(promiseProcessor)).to.be.true;
	});
});
