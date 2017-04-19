'use strict';

const rp = require('request-promise-native')

class HooksData {

    constructor(taskId, user, pass) {
        this.taskId = taskId;
        this.user = user;
        this.pass = pass;
        this.basePath = process.env.ELASTICIO_API_URI || 'https://api.elastic.io';
    }

    request(method, data) {
        const options = {
            url: `${this.basePath}/sailor-support/hooks/task/${this.taskId}/startup/data`,
            method,
            auth: {
                user: this.user,
                pass: this.pass
            },
            json: true
        };
        if (data) {
            options.body = data;
        }
        return rp(options);
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
    const taskId = settings.FLOW_ID;
    const user = settings.API_USERNAME;
    const pass = settings.API_KEY;
    return new HooksData(taskId, user, pass);
};
