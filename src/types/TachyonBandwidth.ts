/**
 * Speed of the Tachyon Storage driver.
 */
export const enum TachyonBandwidth {
	/** use when driver is synchronous or near synchronous */
	VeryLarge = 0,
	/** use when driver uses disk or near ~10ms delays */
	Large = 1,
	/** use when driver uses network or near ~50ms delays */
	Normal = 2,
	/** use when driver uses API or near ~100ms delays */
	Small = 3,
	/** use when driver uses API which have cost for operations */
	VerySmall = 4,
}
