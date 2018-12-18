class BaseDriver {
    async createApp() {
        throw new Error('To be implemented');
    }

    async destroyApp() {
        throw new Error('To be implemented');
    }

    async getAppList() {
        throw new Error('To be implemented');
    }

    async getAppById() {
        throw new Error('To be implemented');
    }
}

module.exports = BaseDriver;
