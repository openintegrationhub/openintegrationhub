class BaseDriver {
    createApp() {
        throw new Error('To be implemented');
    }

    destroyApp() {
        throw new Error('To be implemented');
    }

    getAppList() {
        throw new Error('To be implemented');
    }
}

module.exports = BaseDriver;
