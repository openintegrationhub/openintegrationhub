const request = require('request');

const { OA2_AUTHORIZATION_CODE } = require('../constant').AUTH_TYPE;

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
        grantType: 'authorization_code',
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

module.exports = {
    async start(authClient, flow) {
        // create authorization request url
        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return authClient.property.endpoint.start
                .replace('{{scope}}', encodeURI(flow.scope))
            // store flow id in state
                .replace('{{state}}', encodeURI(flow._id))
                .replace('{{redirectUri}}', encodeURI(authClient.property.redirectUri))
                .replace('{{clientId}}', encodeURI(authClient.property.clientId));
        default:
        }
    },
    async continue(authClient, code) {
        const {
            clientId, clientSecret, redirectUri,
        } = authClient.property;

        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return await exchangeRequest(authClient.property.endpoint.exchange, {
                code,
                clientId,
                clientSecret,
                redirectUri,
            });

        default:
        }
    },
    async refresh(authClient, secret) {
        const { clientId, clientSecret } = authClient.property;
        const { refreshToken } = secret.value;

        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE:
            return await refreshRequest(authClient.property.endpoint.refresh, {
                clientId,
                clientSecret,
                refreshToken,
            });

        default:
        }
    },
};
