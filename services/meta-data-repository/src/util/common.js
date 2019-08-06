module.exports = {
    isLocalRequest(req) {
        if (req.headers.authorization) {
            return false;
        }
        if (req.connection.remoteAddress === req.connection.localAddress) {
            if (req.method === 'GET' && req.originalUrl.match(/schemas.+/)) {
                return true;
            }
        }
        return false;
    },
};
