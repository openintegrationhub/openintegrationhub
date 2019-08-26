module.exports = {
    getToken(req) {
        const header = req.headers.authorization.split(' ');
        if (!header || header.length < 2) {
            return null;
        }
        return header[1];
    },
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
