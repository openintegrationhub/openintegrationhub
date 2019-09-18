const rp = require('request-promise');
const { URL } = require('url');
const npath = require('path');

module.exports = class IamClient {
    constructor({ baseUrl, iamToken }) {
        this._baseUrl = baseUrl;
        this._iamToken = iamToken;
    }

    createToken({ accountId, description, expiresIn, inquirer, }) {
        return this._request({
            method: 'POST',
            path: '/tokens',
            body: {
                accountId,
                description,
                expiresIn,
                inquirer,
            },
        });
    }

    deleteTokenById(tokenId) {
        return this._request({
            method: 'DELETE',
            path: `/tokens/${tokenId}`,
        });
    }

    _request({ method, path, body }) {
        const url = new URL(this._baseUrl);
        url.pathname = npath.join(url.pathname, path);

        return rp({
            method: method || 'GET',
            uri: url.toString(),
            headers: {
                Authorization: `Bearer ${this._iamToken}`,
            },
            body,
            json: true,
        });
    }
};
