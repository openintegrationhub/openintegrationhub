const url = require('url');

const RabbitmqManagement = require('rabbitmq-stats');

class RabbitmqManagementService {

    constructor(app) {
        this._app = app;
        this._logger = app.getLogger().child({service: 'RabbitmqManagement'});
    }

    async start() {
        const managementUri = this._app.getConfig().get('RABBITMQ_MANAGEMENT_URI');
        const parsedUrl = new url.URL(managementUri);
        const {username, password } = parsedUrl;
        this._vhost = parsedUrl.pathname.replace(/^\//, '') || '/';
        parsedUrl.username = '';
        parsedUrl.password = '';
        this._client = new RabbitmqManagement(parsedUrl.toString(), username, password);
    }

    async getQueues() {
        return this._client.getVhostQueues(this._vhost);
    }

    async getExchanges() {
        return this._client.getVhostExchanges(this._vhost);
    }

    async getBindings() {
        return this._client.getVhostBindings(this._vhost);
    }

    async createFlowUser({ username, password, flow }) {
        const userBody = {
            //@todo it would be great to pass a password_hash instead of a password
            // http://www.rabbitmq.com/passwords.html#computing-password-hash
            password,
            tags: 'flow-user'
        };

        await this._client.putUser(username, userBody);

        const readRegex = `^${flow.id}:`;
        const writeRegex = `^${flow.id}$`;
        const permissionsBody = {
            // https://www.rabbitmq.com/access-control.html
            // The regular expression '^$', i.e. matching nothing but the empty string,
            // covers all resources and effectively stops the user from performing any operation.
            // The empty string, '' is a synonym for '^$' and restricts permissions in the exact same way.
            configure: '',
            write: writeRegex,
            read: readRegex
        };

        await this._client.setUserPermissions(username, this._vhost, permissionsBody);
    }

    async deleteUser({ username }) {
        await this._client.deleteUser(username);
    }
}

module.exports = RabbitmqManagementService
