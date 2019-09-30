/// <reference types="node" />

export interface IEventBusOptions {
    serviceName: string;
    rabbitmqUri?: string;
    transport?: any;
}

export interface IEvent {
    readonly payload: any;
    readonly headers: object;
    ack(): Promise<void>;
    nack(): Promise<void>;
    toJSON(): object;
}

interface EventHeaders {
    name: string
}
type EventPayload = any;

interface EventOptions {
    headers: EventHeaders;
    payload: EventPayload;
}

export class Event implements IEvent {
    public constructor(opts: EventOptions);
    public readonly headers: EventHeaders;
    public readonly payload: EventPayload;
    public ack(): Promise<void>;
    public nack(): Promise<void>;
    toJSON(): object;
}

export class EventBus {
    public constructor(opts: IEventBusOptions);
    public connect(): Promise<void>;
    public disconnect(): Promise<void>;
    public publish(event: IEvent): Promise<void>;
    public subscribe(topic: string, callback: (e: IEvent) => Promise<void>): void;
}
