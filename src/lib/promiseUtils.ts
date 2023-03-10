export function isPromiseFunction(func: unknown): func is (...args: unknown[]) => Promise<unknown> {
	return typeof func === 'object' && func !== null && 'then' in func && typeof func.then === 'function';
}
