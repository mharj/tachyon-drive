import type TypedEmitter from 'typed-emitter';

/**
 * The events that the external notify event emitter can emit.
 */
export type ExternalNotifyEvents = {
	update: (timeStamp: Date) => void;
};

/**
 * Event emitter for the external notify event emitter.
 */
export type ExternalNotifyEventEmitter = TypedEmitter<ExternalNotifyEvents>;

/**
 * Constructor for the external notify event emitter.
 * @example
 * extends (EventEmitter as ExternalNotifyEventEmitterConstructor)
 */
export type ExternalNotifyEventEmitterConstructor = {new (): ExternalNotifyEventEmitter};

/**
 * this interface is for building external update notifiers if driver does not internally support it.
 */
export interface IExternalNotify extends ExternalNotifyEventEmitter {
	/**
	 * Initializes the notifier.
	 * @returns A promise when the notifier was successfully initialized.
	 */
	init(): void | Promise<void>;

	/**
	 * Unload the notifier.
	 * @returns A promise when the notifier was successfully unloaded.
	 */
	unload(): void | Promise<void>;

	/**
	 * Notify that the data has been updated. (in store and clear methods)
	 */
	notifyUpdate(timeStamp: Date): void | Promise<void>;
}
