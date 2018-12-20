const request = require('request');
const jwt = require('jsonwebtoken');
const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const { ACCESS_TOKEN, ID_TOKEN, USERINFO } = require('../constant').EXTERNAL_ID_SOURCE;

function requestHelper(url, form) {
    return new Promise((resolve, reject) => {
        request.post(url, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            form,
        }, (err, res, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(body));
            }
        });
    });
}

async function exchangeRequest(url, {
    code, clientId, clientSecret, redirectUri,
}) {
    return await requestHelper(url, {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
    });
}

async function refreshRequest(url, {
    clientId, clientSecret, refreshToken,
}) {
    return await requestHelper(url, {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    });
}

function userinfoRequest(url, token) {
    return new Promise((resolve, reject) => {
        request.get(url, {
            auth: {
                bearer: token,
            },
            json: true,
        }, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
}

module.exports = {
    userinfoRequest,
    async start(authClient, flow, scope) {
        // create authorization request url
        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return authClient.endpoint.auth
                .replace('{{scope}}', encodeURI(
                    (authClient.predefinedScope ? `${authClient.predefinedScope} ` : '') + scope,
                ))
            // store flow id in state
                .replace('{{state}}', encodeURI(flow._id))
                .replace('{{redirectUri}}', encodeURI(authClient.redirectUri))
                .replace('{{clientId}}', encodeURI(authClient.clientId));
        default:
        }
    },
    async continue(authClient, code) {
        const {
            clientId, clientSecret, redirectUri,
        } = authClient;

        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return await exchangeRequest(authClient.endpoint.token, {
                code,
                clientId,
                clientSecret,
                redirectUri,
            });

        default:
        }
    },
    async refresh(authClient, secret) {
        const { clientId, clientSecret } = authClient;
        const { refreshToken } = secret.value;

        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return await refreshRequest(authClient.endpoint.token, {
                clientId,
                clientSecret,
                refreshToken,
            });

        default:
        }
    },
    async getExternalId(authClient, tokens) {
        const { source, key } = authClient.mappings.externalId;
        const { userinfo } = authClient.endpoint;
        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            switch (source) {
            case ACCESS_TOKEN:
                return jwt.decode(tokens.access_token)[key];
            case ID_TOKEN:
                return jwt.decode(tokens.id_token)[key];
            case USERINFO:
                return (await userinfoRequest(userinfo, tokens.access_token))[key];
            default:
                return null;
            }
        default:
        }
    },

    getScope(authClient, tokens) {
        const { key } = authClient.mappings.scope;
        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return tokens[key];
        default:
        }
    },
};
