const url = require('url');

const RabbitmqManagement = require('rabbitmq-stats');

class RabbitmqManagementService {

    constructor(app) {
        this._app = app; 
    }

    async start() {
        const managementUri = this._app.getConfig().get('RABBITMQ_MANAGEMENT_URI');
        const parsedUrl = new url.URL(managementUri);
        const {username, password } = parsedUrl;
        this._vhost = parsedUrl.pathname.replace(/^\//, '');
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
}
module.exports = RabbitmqManagementService
