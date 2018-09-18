const EventEmitter = require('events');
const assert = require('assert');
const logger = require('../logger');

/**
 * Base class for handling kubernetes events/streams
 * Mostly handles errors/reconnections
 */
class KubernetesEventStream extends EventEmitter {

    /**
     * @constructor
     */
    constructor(config = {}) {
        super();
        this._eventStream = null;
        this._reconnectOnError = true;
        this._isReconnecting = false;
        this._connectTries = 0;
        this._maxReconnectRetries = config.maxReconnectRetries || 10;
    }

    /**
     * Connect to kubernetes and begin to receive events from it
     */
    connect() {
        assert(!this._eventStream, 'Already connected');
        this._reconnectOnError = true;
        this._connectOnce();
    }

    /**
     * Disconnect from kubernetes, stop listening for events
     */
    disconnect() {
        logger.info('Disconnecting event stream. Won\'t reconnect anymore.');
        this._reconnectOnError = false;
        this._disconnectOnce();
    }

    /**
     * Create backend stream and begin to listen to it's events
     */
    _connectOnce() {
        this._eventStream = this._createEventStream()
            .on('error', err => {
                logger.error(err, 'Got error event from event stream');
                this._reconnect();
            })
            .on('close', () => {
                logger.info('Got close event from event stream');
                this._reconnect();
            })
            .on('end', this.emit.bind(this, 'end'))
            .on('data', this.emit.bind(this, 'event'))
            .once('data', () => {
                this._connectTries = 0;
            });
    }

    /**
     * Disconnect from backed stream
     * and destroy it
     */
    _disconnectOnce() {
        if (this._eventStream) {
            this._destroyEventStream();
            this._eventStream = null;
        }
    }

    /**
     * Try to reconnect to backend
     */
    _reconnect() {
        if (this._isReconnecting) {
            return logger.info('Event stream is already reconnecting.');
        }
        if (!this._reconnectOnError) {
            return logger.info('No reconnect on error. Won\'t reconnect.');
        }

        if (this._connectTries >= this._maxReconnectRetries) {
            logger.error(`Max reconnection retries reached: ${this._maxReconnectRetries}`);
            this.emit('error', new Error('can\' connect to backend stream'));
            return;
        }

        this._isReconnecting = true;
        this._disconnectOnce();
        this._connectTries++;

        logger.info('Connect tries:', this._connectTries);

        setTimeout(() => {
            logger.info('About to reconnect.');
            this._connectOnce();
            this._isReconnecting = false;
        }, this.constructor.RECONNECT_TIMEOUT);
    }

    /**
     * Create stream of events just from kubernetes
     * Should be implemented by extender
     * In most cases, this should be call to k8s api like this
     * batchApi.namespaces('default').jobs.getStream({qs: {watch: true}});
     * @returns {EventEmitter|ReadableStream}
     */
    _createEventStream() {
        throw new Error('should be implemented');
    }

    /**
     * Destroy backend stream
     * Should be implemented by extender
     */
    _destroyEventStream() {
        throw new Error('should be implemented');
    }

    /**
     * @type {Number}
     * Time to sleep before reconnecting to backend
     */
    static get RECONNECT_TIMEOUT() {
        return 500;
    }
}

module.exports = KubernetesEventStream;
