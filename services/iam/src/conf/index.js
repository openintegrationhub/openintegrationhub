const path = require('path');

const CONSTANTS = require('./../constants');
const pkg = require('../../package.json');
const serviceClient = require('../oidc/util/clients/service-client');
const { optional, getPassword } = require('../util/check-env');

const useHttps = optional('IAM_USE_SSL', 'false') === 'true';
const port = optional('IAM_PORT', 3099);
const baseurl = optional('IAM_BASEURL', `${useHttps ? 'https' : 'http'}://127.0.0.1:3099`);

const apiBase = optional('IAM_APIBASE', 'api/v1');
const oidcBase = optional('IAM_OIDCBASE', 'op');
const originwhitelist = optional('IAM_ORIGINWHITELIST') ? optional('IAM_ORIGINWHITELIST').split(',') : [];
const config = {

    getBaseUrl: () => `${baseurl}`,
    getApiBaseUrl: () => `${baseurl}/${apiBase}`,
    getOidcBaseUrl: () => `${baseurl}/${oidcBase}`,
    general: {
        authType: optional('IAM_AUTH_TYPE', 'basic'),
        debug: optional('IAM_DEBUG', 'false') === 'true',

        loggingNameSpace: 'accounts',

        useHttps,
        apiBase,
        port,

        mongodb_url: optional('IAM_MONGODB_CONNECTION', 'mongodb://localhost:27017/accounts'),

        originWhitelist: originwhitelist.concat(optional('NODE_ENV', 'development') !== 'production' ? [
            // development only
            '127.0.0.1',
            'localhost',
        ] : [
        ]),
    },
    accounts: {
        admin: {
            username: optional('IAM_ACC_ADMIN_USERNAME', 'admin@example.com'),
            password: getPassword('IAM_ACC_ADMIN_PASSWORD'),
            firstname: 'admin',
            lastname: 'admin',
        },
        serviceAccount: {
            username: optional('IAM_ACC_SERVICEACCOUNT_USERNAME', 'service-iam@example.com'),
            password: getPassword('IAM_ACC_SERVICEACCOUNT_PASSWORD'),
            firstname: 'sa',
            lastname: 'sa',
        },
        keystoreFile: optional('IAM_OIDC_KEYSTORE_PATH', path.join(__dirname, '../../', 'keystore/keystore.json')),

    },
    jwt: {
        issuer: optional('IAM_BASEURL', 'https://www.example.com'),
        audience: optional('IAM_JWT_AUDIENCE', 'service.example.com'),
        algorithm: optional('IAM_JWT_ALGORITHM', 'HS256'),
        algorithmType: optional('IAM_JWT_ALGORITHM_TYPE', CONSTANTS.JWT_ALGORITHMS.HMAC),
        expiresIn: optional('IAM_JWT_EXPIRES', '3h'),
        jwtsecret: getPassword('IAM_JWT_SECRET'),
        cookieName: optional('IAM_JWT_COOKIENAME', 'cookiename'),
    },
    oidc: {
        serviceClient,
        base: oidcBase,
        dbPrefix: optional('IAM_OIDC_DBPREFIX', 'oidc'),
        acrValues: ['session', 'urn:mace:incommon:iap:bronze'],
        issuer: baseurl,
        cookies: {
            long: { signed: true, maxAge: parseInt(optional('IAM_OIDC_MAXAGE', (1 * 24 * 60 * 60) * 1000), 10) }, // 1 day in ms
            short: { signed: true },
            keys: [`${getPassword('IAM_JWT_SECRET')}`],
            thirdPartyCheckUrl: `${baseurl}/static/oidc/start.html`,
        },
        discovery: {
            service_documentation: pkg.homepage,
            version: pkg.version,
        },
        claims: {
            amr: null,
            global: [
                'username',
                'firstname',
                'lastname',
                'status',
                'role',
                'memberships',
                'confirmed',
            ],
        },
        features: {
            devInteractions: false,
            discovery: true,
            requestUri: true,
            oauthNativeApps: true,
            pkce: true,
            clientCredentials: true,
            backchannelLogout: true,
            claimsParameter: true,
            encryption: true,
            frontchannelLogout: true,
            introspection: true,
            request: true,
            revocation: true,
            sessionManagement: true,
            // ...{
            //     registration: true,
            //     registrationManagement: { rotateRegistrationAccessToken: true },
            // },
        },
        subjectTypes: ['public'],

        interactionUrl: function interactionUrl(ctx, interaction) { // eslint-disable-line no-unused-vars
            return `/${oidcBase}/interaction/${ctx.oidc.uuid}`;
        },

        async interactionCheck(ctx) {
            if (!ctx.oidc.session.sidFor(ctx.oidc.client.clientId)) {
                return {
                    error: 'consent_required',
                    error_description: 'client not authorized for End-User session yet',
                    reason: 'client_not_authorized',
                };
            } else if (
                ctx.oidc.client.applicationType === 'native' &&
                ctx.oidc.params.response_type !== 'none' &&
                !ctx.oidc.result) { // TODO: in 3.x require consent to be passed in results
                return {
                    error: 'interaction_required',
                    error_description: 'native clients require End-User interaction',
                    reason: 'native_client_prompt',
                };
            }

            return false;
        },

        clientCacheDuration: 1 * 24 * 60 * 60, // 1 day in seconds,
        ttl: {
            AccessToken: optional('IAM_OIDC_TTL_ACCESSTOKEN', 1 * 60 * 60), // 1 hour in seconds
            AuthorizationCode: optional('IAM_OIDC_TTL_AUTHCODE', 10 * 60), // 10 minutes in seconds
            ClientCredentials: optional('IAM_OIDC_TTL_CLIENTCRED', 10 * 60), // 10 minutes in seconds
            IdToken: optional('IAM_OIDC_TTL_IDTOKEN', 1 * 60 * 60), // 1 hour in seconds
            RefreshToken: optional('IAM_OIDC_TTL_REFRESHTOKEN', 1 * 24 * 60 * 60), // 1 day in seconds
            RegistrationAccessToken: optional('IAM_OIDC_TTL_REGACCESSTOKEN', 1 * 24 * 60 * 60), // 1 day in seconds
        },
        /*
       * logoutSource
       *
       * description: HTML source to which a logout form source is passed when session management
       *   renders a confirmation prompt for the User-Agent.
       * affects: session management
       */

        async logoutSource(ctx, form) {
            ctx.body = `<!DOCTYPE html>
                <head>
                <title>Logout</title>
                </head>
                <body>
                    <script>
                        function logout() {
                        var form = document.forms[0];
                        var input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'logout';
                        input.value = 'yes';
                        form.appendChild(input);
                        form.submit();
                        }
                    </script>
                    ${form}
                    <script>
                        logout()
                    </script>
                </body>
            </html>`;
        },

        /*
       * renderError
       *
       * description: Helper used by the OP to present errors which are not meant to be 'forwarded' to
       *   the RP's redirect_uri
       * affects: presentation of errors encountered during authorization
       */
        async renderError(ctx, error) {
            ctx.type = 'html';
            ctx.body = `<!DOCTYPE html>
                <head>
                    <title>Server Error</title>
                </head>
                <body>
                    <pre>${JSON.stringify(error, null, 4)}</pre>
                </body>
            </html>`;
        },
    },
};

// Accept self signed certificates. Use with caution!

if (config.general.useHttps) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

module.exports = config;
