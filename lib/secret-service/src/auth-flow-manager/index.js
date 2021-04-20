const fetch = require('node-fetch');
const { Headers } = require('node-fetch');
const dotProp = require('dot-prop');
const { OAuth } = require('oauth');

const logger = require('@basaas/node-logger');
const conf = require('../conf');
const { OA2_AUTHORIZATION_CODE, OA1_THREE_LEGGED, SESSION_AUTH } = require('../constant').AUTH_TYPE;
const { HEADER_AUTH, BODY_AUTH, PARAMS_AUTH } = require('../constant').AUTH_REQUEST_TYPE;
const defaultAdapter = require('../adapter/preprocessor/default');

const log = logger.getLogger(`${conf.log.namespace}/auth-flow-manager`);

class HTTPResponseError extends Error {
    constructor(response, ...args) {
        this.response = response;
        super(`HTTP Error Response: ${response.status} ${response.statusText}`, ...args);
    }
}

const checkStatus = (response) => {
    if (!response.ok) {
        throw new HTTPResponseError(response);
    } else {
        // response.status >= 200 && response.status < 300
        return response;
    }
};

// tools
// oauth

async function oauthGetAccess({ authClient, flow, queryObject }) {
    return new Promise((resolve, reject) => {
        const oauth = new OAuth(
            authClient.endpoints.request,
            authClient.endpoints.access,
            authClient.key,
            authClient.secret,
            '1.0A',
            authClient.redirectUri,
            'HMAC-SHA1',
        );
        const token = flow.requestToken;
        const tokenSecret = flow.requestTokenSecret;
        const verifier = queryObject.oauth_verifier;
        oauth.getOAuthAccessToken(token, tokenSecret, verifier, (error, accessToken, accessTokenSecret, results) => {
            if (error) {
                reject(error);
            } else {
                resolve({
                    accessToken, accessTokenSecret,
                });
            }
        });
    });
}

async function oauthGetAuthorize({ authClient, flow }) {
    return new Promise((resolve, reject) => {
        const oauth = new OAuth(
            authClient.endpoints.request,
            authClient.endpoints.accessL,
            authClient.key,
            authClient.secret,
            '1.0A',
            authClient.redirectUri,
            'HMAC-SHA1',
        );
        oauth.getOAuthRequestToken(async (error, token, tokenSecret, results) => {
            if (error) {
                reject(error);
            } else {
                flow.requestToken = token;
                flow.requestTokenSecret = tokenSecret;
                await flow.save();
                resolve(`${authClient.endpoints.authorize}?oauth_token=${token}&name=${authClient.appName}&scope=${flow.scope}&expiration=${authClient.expiration}`);
            }
        });
    });
}

// oauth2
async function requestHelper(url, form) {
    const params = new URLSearchParams();
    for (const property in form) {
        if (Object.prototype.hasOwnProperty.call(form, property)) {
            params.append(property, form[property]);
        }
    }
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    })
        .then(checkStatus)
        .then(response => {return response.json()})
        .catch(error => {throw new Error(error)});
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

async function sessionRequest(url, {
    inputFields, authType, tokenPath, requestFields,
}) {
    let body = {};
    const headers = new Headers();
    switch (authType) {
    case PARAMS_AUTH:
        const params = new URLSearchParams();
        requestFields.forEach((entry) => params.append(entry.key, inputFields[entry.key])); // TODO: Implement "smart" parsing of request fields
        body = params;
        break;
    case BODY_AUTH:
        requestFields.forEach((entry) => body[entry.key] = inputFields[entry.key]); // TODO: Implement "smart" parsing of request fields
        break;
    case HEADER_AUTH:
        requestFields.forEach((entry) => headers.append(entry.key, inputFields[entry.key])); // TODO: Implement "smart" parsing of request fields
        break;
    default:
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            body,
            headers,
        });
        const obj = await checkStatus(response).json();
        const getValue = (object, keys) => keys.split('.').reduce((o, k) => (o || {})[k], object);
        return getValue(obj,tokenPath);
    } catch (error) {
        log.error(error);
        throw new Error(error);
    }
}

async function userinfoRequest(url, token) {
    fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then(checkStatus)
        .then((response) => response.json())
        .catch((error) => { throw new Error(error); });
}

module.exports = {
    userinfoRequest,
    async start({
        authClient, flow, scope, state,
    }) {
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
        case OA1_THREE_LEGGED:
            return await oauthGetAuthorize({
                authClient, flow,
            });
        default:
        }
    },
    async continue({
        authClient, code, flow, queryObject,
    }) {
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
        case OA1_THREE_LEGGED:
            return await oauthGetAccess({
                authClient, flow, queryObject,
            });
        default:
        }
    },
    async refresh(authClient, secret) {

        switch (authClient.type) {
        case OA2_AUTHORIZATION_CODE: {
            const { clientId, clientSecret } = authClient;
            const { refreshToken } = secret.value;
            return await refreshRequest(authClient.endpoints.token, {
                clientId,
                clientSecret,
                refreshToken,
            });
        }
        case SESSION_AUTH: {
            const { tokenPath } = authClient;
            const { authType, url, requestFields } = authClient.endpoints.auth;
            const { inputFields } = secret.value;
            return await sessionRequest(url, {
                inputFields,
                authType,
                tokenPath,
                requestFields,
            });
        }
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
