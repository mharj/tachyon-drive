import * as sinon from 'sinon';
import {type ILoggerLike} from '@avanio/logger-like';

const logDebugSpy = sinon.spy();
const logInfoSpy = sinon.spy();
const logWarnSpy = sinon.spy();
const logErrorSpy = sinon.spy();

export function resetLoggerSpies() {
	logDebugSpy.resetHistory();
	logInfoSpy.resetHistory();
	logWarnSpy.resetHistory();
	logErrorSpy.resetHistory();
}

export const sinonLoggerSpy = {
	debug: logDebugSpy,
	error: logErrorSpy,
	info: logInfoSpy,
	warn: logWarnSpy,
} satisfies ILoggerLike;
