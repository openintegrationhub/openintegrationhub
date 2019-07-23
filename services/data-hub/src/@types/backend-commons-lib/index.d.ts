declare module 'backend-commons-lib' {
    class App {
        protected _run(): Promise<void>;
        public getContainer(): Container;
        public start(): Promise<void>;
    }

    interface Container {
        resolve(resourceName: string): any;
    }
}
