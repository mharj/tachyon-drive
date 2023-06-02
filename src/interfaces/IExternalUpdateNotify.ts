/**
 * this interface is for building external update notifiers if driver does not internally support it.
 */
export interface IExternalNotify {
	/**
	 * onUpdate callback registeration
	 */
	onUpdate(callback: () => Promise<void>): void;
	/**
	 * Notify that the data has been updated. (in store and clear methods)
	 */
	notifyUpdate(): Promise<void>;
}
