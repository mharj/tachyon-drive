import {describe, expect, it} from 'vitest';

describe('tachyon-expire-cache', () => {
	it('test CJS loading', () => {
		const {TachyonExpireCache} = require('tachyon-expire-cache');
		expect(TachyonExpireCache).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {TachyonExpireCache} = await import('tachyon-expire-cache');
		expect(TachyonExpireCache).toBeInstanceOf(Object);
	});
});
