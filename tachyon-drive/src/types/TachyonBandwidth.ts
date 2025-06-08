/**
 * Speed of the Tachyon Storage driver.
 * @since v0.6.0
 */
export const TachyonBandwidth = {
	/** use when driver is synchronous or near synchronous */
	VeryLarge: 0,
	/** use when driver uses disk or near ~10ms delays */
	Large: 1,
	/** use when driver uses network or near ~50ms delays */
	Normal: 2,
	/** use when driver uses API or near ~100ms delays */
	Small: 3,
	/** use when driver uses API which have cost for operations */
	VerySmall: 4,
} as const;

export type TachyonBandwidth = (typeof TachyonBandwidth)[keyof typeof TachyonBandwidth];

/**
 * Get the name of the TachyonBandwidth.
 * @param {TachyonBandwidth} bandwidth - The TachyonBandwidth to get the name of.
 * @returns {'VeryLarge' | 'Large' | 'Normal' | 'Small' | 'VerySmall'} The name of the TachyonBandwidth.
 * @since v0.6.0
 */
export function getTachyonBandwidthName(bandwidth: TachyonBandwidth): 'VeryLarge' | 'Large' | 'Normal' | 'Small' | 'VerySmall' {
	switch (bandwidth) {
		case TachyonBandwidth.VeryLarge:
			return 'VeryLarge';
		case TachyonBandwidth.Large:
			return 'Large';
		case TachyonBandwidth.Normal:
			return 'Normal';
		case TachyonBandwidth.Small:
			return 'Small';
		case TachyonBandwidth.VerySmall:
			return 'VerySmall';
		default:
			throw new TypeError(`Unknown TachyonBandwidth: '${String(bandwidth)}'`);
	}
}
