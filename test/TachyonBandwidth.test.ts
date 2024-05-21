import 'mocha';
import * as chai from 'chai';
import {getTachyonBandwidthName, TachyonBandwidth} from '../src';

const expect = chai.expect;

describe('TachyonBandwidth', function () {
	describe('getTachyonBandwidthName', function () {
		it('should get value for enum', function () {
			expect(getTachyonBandwidthName(TachyonBandwidth.VeryLarge)).to.equal('VeryLarge');
			expect(getTachyonBandwidthName(TachyonBandwidth.Large)).to.equal('Large');
			expect(getTachyonBandwidthName(TachyonBandwidth.Normal)).to.equal('Normal');
			expect(getTachyonBandwidthName(TachyonBandwidth.Small)).to.equal('Small');
			expect(getTachyonBandwidthName(TachyonBandwidth.VerySmall)).to.equal('VerySmall');
		});
		it('should throw error for unknown value', function () {
			expect(() => getTachyonBandwidthName('' as unknown as TachyonBandwidth)).to.throw(TypeError, 'Unknown TachyonBandwidth: ');
		});
	});
});
