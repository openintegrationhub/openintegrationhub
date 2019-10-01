/// <reference types="node" />

export class App {
    protected _run(): Promise<void>;
    public getContainer(): Container;
    public start(): Promise<void>;
}

export interface Container {
    resolve(resourceName: string): any;
}
