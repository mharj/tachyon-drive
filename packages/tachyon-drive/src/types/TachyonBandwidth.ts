/**
 * Speed of the Tachyon Storage driver.
 * @since v0.6.0
 */
// biome-ignore assist/source/useSortedKeys: const values are not sorted
export const TachyonBandwidth = {
	/** use when driver is synchronous or near synchronous */
	VeryLarge: 'VeryLarge',
	/** use when driver uses disk or near ~10ms delays */
	Large: 'Large',
	/** use when driver uses network or near ~50ms delays */
	Normal: 'Normal',
	/** use when driver uses API or near ~100ms delays */
	Small: 'Small',
	/** use when driver uses API which have cost for operations */
	VerySmall: 'VerySmall',
} as const;

export type TachyonBandwidth = (typeof TachyonBandwidth)[keyof typeof TachyonBandwidth];
