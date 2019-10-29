/// <reference types="node" />

import { Channel, Connection } from 'amqplib';
import Logger from 'bunyan';
import { IStore } from 'nconf';

export class App {
    protected _run(): Promise<void>;
    public getContainer(): Container;
    public start(): Promise<void>;
}

export interface Container {
    resolve(resourceName: string): any;
}

interface AssertQueueOptions {
    exclusive?: boolean;
    durable?: boolean;
    autoDelete?: boolean;
    arguments?: any;
    messageTtl?: number;
    expires?: number;
    deadLetterExchange?: string;
    deadLetterRoutingKey?: string;
    maxLength?: number;
    maxPriority?: number;
}

export class QueueCreator {
    static COLLECTOR_EXCHANGE: string;

    constructor(channel: Channel);

    assertExchange(exchangeName: string): Promise<void>;
    assertQueue(queueName: string, options: AssertQueueOptions): Promise<void>;
    assertMessagesQueue(queueName: string, deadLetterExchange: string, deadLetterKey: string): Promise<void>;
    assertReboundsQueue(queueName: string, returnToExchange: string, returnWithKey: string): Promise<void>;
    bindQueue(queueName: string, exchangeName: string, routingKey: string): Promise<void>;
    bindExchange(destination: string, source: string, pattern: string): Promise<void>;
    deleteQueue(queueName: string): Promise<void>;
}

export interface AMQPServiceOptions {
    logger: Logger;
    config: IStore;
}

export class AMQPService {
    constructor(opts: AMQPServiceOptions);
    start(): Promise<void>;
    getConnection(): Connection;
}

import * as AMQPLib from 'amqplib';
export {Logger, AMQPLib, IStore as ConfigStore};
