/// <reference types="node" />

export interface IEventBusOptions {
    serviceName: string;
    rabbitmqUri?: string;
    transport?: any;
}

export interface IEvent {
    readonly payload: any;
    readonly headers: object;
    ack(): void;
    nack(): void;
}

export class Event implements IEvent {
    public readonly payload: any;
    public readonly headers: object;
    public ack(): void;
    public nack(): void;
}

export class EventBus {
    public constructor(opts: IEventBusOptions);
    public connect(): Promise<void>;
    public disconnect(): Promise<void>;
    public publish(event: IEvent): Promise<void>;
    public subscribe(topic: string, callback: (e: IEvent) => Promise<void>): void;
}
