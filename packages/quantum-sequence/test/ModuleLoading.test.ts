import {describe, expect, it} from 'vitest';

describe('quantum-sequence', () => {
	it('test CJS loading', () => {
		const {QuantumMap} = require('quantum-sequence');
		expect(QuantumMap).toBeInstanceOf(Object);
	});
	it('test ESM loading', async () => {
		const {QuantumMap} = await import('quantum-sequence');
		expect(QuantumMap).toBeInstanceOf(Object);
	});
});
