const request = require('request');
const dotProp = require('dot-prop');
const { OAuth } = require('oauth');

const logger = require('@basaas/node-logger');
const conf = require('../conf');
const { OA2_AUTHORIZATION_CODE, OA1_THREE_LEGGED } = require('../constant').AUTH_TYPE;
const defaultAdapter = require('../adapter/preprocessor/default');

const log = logger.getLogger(`${conf.log.namespace}/auth-flow-manager`);

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
                    log.error({ __errName: 'requestHelper failed to parse response', body, exception: e });
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
