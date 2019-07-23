/// <reference types="node" />
declare module 'stream-concat' {
    import { Readable } from 'stream';

    export default class StreamConcat extends Readable {
        public constructor(streams: Readable[]);
    }
}
