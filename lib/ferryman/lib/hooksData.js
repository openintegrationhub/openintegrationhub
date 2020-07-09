'use strict';

const request = require('requestretry');

class HooksData {

    constructor({
        FLOW_ID: taskId,
        API_USERNAME: user,
        API_KEY: pass,
        API_URI: basePath,
        API_REQUEST_RETRY_ATTEMPTS: maxAttempts,
        API_REQUEST_RETRY_DELAY: retryDelay
    }) {
        this.taskId = taskId;
        this.user = user;
        this.pass = pass;
        this.basePath = basePath;
        this.maxAttempts = maxAttempts;
        this.retryDelay = retryDelay;
    }

    async request(method, data) {
        const options = {
            url: `${this.basePath}/sailor-support/hooks/task/${this.taskId}/startup/data`,
            method,
            auth: {
                user: this.user,
                pass: this.pass
            },
            json: true,
            forever: true,
            headers: {
                Connection: 'Keep-Alive'
            },
            maxAttempts: this.maxAttempts,
            retryDelay: this.retryDelay,
            retryStrategy: request.RetryStrategies.HTTPOrNetworkError
        };
        if (data) {
            options.body = data;
        }
        const { statusCode, body } = await request(options);

        if (statusCode >= 400) {
            throw Object.assign(new Error(body.error), { statusCode });
        }

        return body;
    }

    create(data) {
        return this.request('POST', data);
    }

    retrieve() {
        return this.request('GET');
    }

    delete() {
        return this.request('DELETE');
    }

}

module.exports.startup = function startup(settings) {
    return new HooksData(settings);
};
