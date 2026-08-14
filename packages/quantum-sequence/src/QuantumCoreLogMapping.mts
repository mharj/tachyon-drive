import type {KeyLoggerMapInfer} from '@luolapeikko/key-logger';
import type {LogLevelType} from '@luolapeikko/loglevel-type';

/**
 * The default log levels for the storage driver.
 */
export const defaultQuantumCoreLogLevels: {
	readonly clear: LogLevelType;
	readonly constructor: LogLevelType;
	readonly driver_update_event: LogLevelType;
	readonly init: LogLevelType;
	readonly notify_hydrate: LogLevelType;
	readonly register_hydrate_callback: LogLevelType;
	readonly store: LogLevelType;
} = {
	clear: 'none',
	constructor: 'none',
	driver_update_event: 'none',
	init: 'debug',
	notify_hydrate: 'none',
	register_hydrate_callback: 'none',
	store: 'debug',
} as const;

export type QuantumCoreLogMap = KeyLoggerMapInfer<typeof defaultQuantumCoreLogLevels>;
