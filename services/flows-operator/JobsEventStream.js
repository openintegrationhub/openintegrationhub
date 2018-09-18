const JSONStream = require('JSONStream');

const KubernetesEventStream = require('./KubernetesEventStream.js');

/**
 * Class that represents event stream about jobs from kubernetes
 */
class JobEventStream extends KubernetesEventStream {

    /**
     * @constructor
     * @param {kubernetes-client.Batch} batchApi
     * @param {String} namespace
     */
    constructor(batchApi, namespace, config) {
        super(config);
        this._batch = batchApi;
        this._namespace = namespace;
    }

    /**
     * @override {KubernetesEventStream}
     * Details: kubernetes sends events as a sequence of json
     * serialized objects. But, boundaries of json objects and boundaries
     * of chunks, sent over http mismatches, so it's required to reassamble
     * this chunks into json's. JSONStream library is used for this.
     */
    _createEventStream() {
        const jsonParserStream = JSONStream.parse();
        const backendStream = this._batch.namespaces(this._namespace).jobs.getStream({
            qs: {
                watch: true
            }
        });

        return backendStream
            .on('error', jsonParserStream.emit.bind(jsonParserStream, 'error'))
            .on('close', jsonParserStream.emit.bind(jsonParserStream, 'close'))
            .on('end', jsonParserStream.emit.bind(jsonParserStream, 'end'))
            .pipe(jsonParserStream);
    }

    /**
     * @override {KubernetesEventStream}
     */
    _destroyEventStream() {
        this._eventStream.destroy();
    }
}

module.exports = JobEventStream;
