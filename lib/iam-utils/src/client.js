const rp = require('request-promise');
const { URL } = require('url');
const _path = require('path');
const { iamClientAuthType } = require('./conf');

module.exports = class IamClient {
    constructor({ baseUrl, iamToken }) {
        this._baseUrl = baseUrl;
        this._iamToken = iamToken;
    }

    createToken({
        accountId,
        description,
        expiresIn,
        inquirer,
        forceNew,
        customPermissions = undefined,
    }) {
        return this._request({
            method: 'POST',
            path: '/tokens',
            body: {
                accountId,
                description,
                expiresIn,
                inquirer,
                customPermissions,
                new: forceNew || false,
            },
        });
    }

    deleteTokenById(tokenId) {
        return this._request({
            method: 'DELETE',
            path: `/tokens/${tokenId}`,
        });
    }

    getToken() {
        return this._iamToken;
    }

    _request({ method, path, body }) {
        const url = new URL(this._baseUrl);
        url.pathname = _path.join(url.pathname, path);

        return rp({
            method: method || 'GET',
            uri: url.toString(),
            headers: {
                Authorization: `Bearer ${this._iamToken}`,
                'x-auth-type': iamClientAuthType,
            },
            body,
            json: true,
        });
    }
};
