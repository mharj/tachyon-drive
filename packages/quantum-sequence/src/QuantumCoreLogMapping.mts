import {LogLevel, type LogLevelValue, type LogMapInfer} from '@avanio/logger-like';

/**
 * The default log levels for the storage driver.
 */
export const defaultQuantumCoreLogLevels: {
	readonly clear: LogLevelValue;
	readonly constructor: LogLevelValue;
	readonly driver_update_event: LogLevelValue;
	readonly init: LogLevelValue;
	readonly notify_hydrate: LogLevelValue;
	readonly register_hydrate_callback: LogLevelValue;
	readonly store: LogLevelValue;
} = {
	clear: LogLevel.None,
	constructor: LogLevel.None,
	driver_update_event: LogLevel.None,
	init: LogLevel.Debug,
	notify_hydrate: LogLevel.None,
	register_hydrate_callback: LogLevel.None,
	store: LogLevel.Debug,
} as const;

export type QuantumCoreLogMap = LogMapInfer<typeof defaultQuantumCoreLogLevels>;
