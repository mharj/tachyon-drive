import {describe, expect, it} from 'vitest';
import {TachyonBandwidth} from '../src/index.js';

describe('TachyonBandwidth', function () {
	describe('getTachyonBandwidthName', function () {
		it('should get value for enum', function () {
			expect(TachyonBandwidth.VeryLarge).to.equal('VeryLarge');
			expect(TachyonBandwidth.Large).to.equal('Large');
			expect(TachyonBandwidth.Normal).to.equal('Normal');
			expect(TachyonBandwidth.Small).to.equal('Small');
			expect(TachyonBandwidth.VerySmall).to.equal('VerySmall');
		});
	});
});
