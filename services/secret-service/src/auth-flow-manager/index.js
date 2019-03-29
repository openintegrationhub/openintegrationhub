const request = require('request');
const jwt = require('jsonwebtoken');
const dotProp = require('dot-prop');
const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const {
    ACCESS_TOKEN,
    ID_TOKEN,
    USERINFO,
    TOKEN_RESPONSE,
} = require('../constant').EXTERNAL_SOURCE;

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
    async start(authClient, scope, state) {
        // create authorization request url
        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return authClient.endpoints.auth
                .replace('{{scope}}', encodeURI(
                    (authClient.predefinedScope ? `${authClient.predefinedScope} ` : '') + scope,
                ))
                .replace('{{state}}', encodeURI(state))
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
            return await exchangeRequest(authClient.endpoints.token, {
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
            return await refreshRequest(authClient.endpoints.token, {
                clientId,
                clientSecret,
                refreshToken,
            });

        default:
        }
    },
    async getExternalData(localMiddleware, authClient, tokens, externalItem) {
        if (!authClient.mappings || !authClient.mappings[externalItem]) {
            return null;
        }

        const { source, key } = authClient.mappings[externalItem];
        const { userinfo } = authClient.endpoints;

        // load adapter if source references function in middleware
        if (source.match(/^adapter\./)) {
            const adapter = dotProp.get(localMiddleware, source.replace('adapter.', ''));
            if (!adapter) {
                return null;
            }

            return await adapter(tokens);
        }

        // use default
        switch (source) {
        case ACCESS_TOKEN:
            return jwt.decode(tokens.access_token)[key];
        case ID_TOKEN:
            return jwt.decode(tokens.id_token)[key];
        case USERINFO:
            return (await userinfoRequest(userinfo, tokens.access_token))[key];
        case TOKEN_RESPONSE:
            return tokens[key];
        default:
            return null;
        }
    },
};
