const url = require('url');
const RabbitmqManagement = require('rabbitmq-stats');

class RabbitMqManagementService {
    constructor({ config, logger }) {
        this._config = config;
        this._logger = logger.child({ service: 'RabbitmqManagement' });
        this._client = this._createClient();
    }

    /**
     * Creates RabbitMQ management client.
     * @private
     */
    _createClient() {
        const managementUri = this._config.get('RABBITMQ_MANAGEMENT_URI');
        const parsedUrl = new url.URL(managementUri);
        const { username, password } = parsedUrl;
        this._vhost = parsedUrl.pathname.replace(/^\//, '') || '/';
        parsedUrl.username = '';
        parsedUrl.password = '';
        return new RabbitmqManagement(parsedUrl.toString(), username, password);
    }

    /**
     * Get all virtual host's queues.
     * @returns {Promise<*>}
     */
    async getQueues() {
        return this._client.getVhostQueues(this._vhost);
    }

    /**
     * Get all virtual host's exchanges.
     * @returns {Promise<*>}
     */
    async getExchanges() {
        return this._client.getVhostExchanges(this._vhost);
    }

    /**
     * Get all virtual host's bindings.
     * @returns {Promise<*>}
     */
    async getBindings() {
        return this._client.getVhostBindings(this._vhost);
    }

    /**
     * Create RabbitMQ user for a flow.
     * @param {string} username
     * @param {string} password
     * @param {Flow} flow - Flow instance
     * @returns {Promise<void>}
     */
    async createFlowUser({ username, password, flow, backchannel }) {
        const userBody = {
            //@todo it would be great to pass a password_hash instead of a password
            // http://www.rabbitmq.com/passwords.html#computing-password-hash
            password,
            tags: 'flow-user'
        };

        await this._client.putUser(username, userBody);

        const readRegex = `^flow-${flow.id}:`;
        const writeRegex = `^(${backchannel}|flow-${flow.id})$`;
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

    /**
     * Create RabbitMQ user for a global component.
     * @param {string} username
     * @param {string} password
     * @param {Component} component - Global component instance
     * @returns {Promise<void>}
     */
    async createGlobalComponentUser({ username, password, component, backchannel }) {
        const userBody = {
            //@todo it would be great to pass a password_hash instead of a password
            // http://www.rabbitmq.com/passwords.html#computing-password-hash
            password,
            tags: 'component-user'
        };

        await this._client.putUser(username, userBody);

        const readRegex = `^component-${component.id}:`;
        const writeRegex = `^(${backchannel}|component-${component.id})$`;
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


    /**
     * Delete RabbitMQ user.
     * @param {Object} credentials
     * @param {string} credentials.username
     * @returns {Promise<void>}
     */
    async deleteUser({ username }) {
        try {
            await this._client.deleteUser(username);
        } catch (e) {
            if (e.statusCode !== 404) {
                e.message = `Failed to delete RabbitMQ user: ${e.message}`;
                throw e;
            }
        }
    }
}

module.exports = RabbitMqManagementService;
