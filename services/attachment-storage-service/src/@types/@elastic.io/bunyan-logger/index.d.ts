/// <reference types="node" />

declare module '@elastic.io/bunyan-logger' {
    import * as Logger from 'bunyan';

    export function createLogger(options: Logger.LoggerOptions): Logger;
}
