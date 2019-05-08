const request = require('request');
const dotProp = require('dot-prop');
const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;
const defaultAdapter = require('../adapter/preprocessor/default');

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
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
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

    async preprocessSecret({
        flow, authClient, secret, tokenResponse, localMiddleware,
    }) {
        if (authClient.preprocessor) {
            const adapter = dotProp.get(localMiddleware, authClient.preprocessor);
            if (!adapter) {
                throw (new Error(`Missing preprocessor ${authClient.preprocessor}`));
            }
            return await adapter({
                flow, authClient, secret, tokenResponse,
            });
        }
        // use default preprocessor
        return await defaultAdapter({
            flow, authClient, secret, tokenResponse,
        });
    },
};
