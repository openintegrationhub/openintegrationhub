const path = require('path');
const pkg = require('../../package.json');
const serviceClient = require('../oidc/util/clients/service-client');
const { optional, getPassword } = require('../util/check-env');

const CONSTANTS = require('../constants');

const port = optional('IAM_PORT', 3099);
const baseurl = optional('IAM_BASEURL', 'https://127.0.0.1:3099');
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

        useHttps: optional('IAM_USE_SSL') && optional('IAM_USE_SSL') === 'true',

        loggingNameSpace: 'accounts',

        apiBase,
        port,

        mongodb_url: optional('IAM_MONGODB_CONNECTION', 'mongodb://localhost:27017/accounts'),
        rabbitmqUrl: optional('AMQP_RECEIVE_URL', 'amqp://guest:guest@localhost:5672'),
        originWhitelist: originwhitelist.concat(optional('NODE_ENV') !== 'production' ? [
            // development only
            '127.0.0.1', 
            'localhost',
        ] : [

        ]),

        keystoreFile: optional('IAM_OIDC_KEYSTORE_PATH') || path.join(__dirname, '../../', 'keystore/keystore.json'),
    },
    accounts: {
        admin: {
            username: optional('IAM_ACC_ADMIN_USERNAME', 'admin@example.com'),
            password: getPassword('IAM_ACC_ADMIN_PASSWORD','1234'),
            firstname: 'admin',
            lastname: 'admin',
        },
        serviceAccount: {
            username: optional('IAM_ACC_SERVICEACCOUNT_USERNAME', 'service-iam@example.com'),
            password: getPassword('IAM_ACC_SERVICEACCOUNT_PASSWORD'),
            firstname: 'sa',
            lastname: 'sa',
        },

    },
    jwt: {       
        issuer: optional('IAM_BASEURL', 'https://www.example.com'),
        audience: optional('IAM_JWT_AUDIENCE', 'example.com'),
        algorithm: optional('IAM_JWT_ALGORITHM', 'HS256'),
        algorithmType: optional('IAM_JWT_ALGORITHM_TYPE', CONSTANTS.JWT_ALGORITHMS.HMAC),
        expiresIn: optional('IAM_JWT_EXPIRES', '3h'),
        jwtsecret: getPassword('IAM_JWT_SECRET'),
        cookieName: optional('IAM_JWT_COOKIENAME', 'cookiename'),
    },
    oidc: {
        serviceClient,
        base: oidcBase,
        keystoreFile: optional('IAM_OIDC_KEYSTORE_PATH', path.join(__dirname, '../../', 'keystore/keystore.json')),
        dbPrefix: optional('IAM_OIDC_DBPREFIX', 'oidc'),
        acrValues: ['session', 'urn:mace:incommon:iap:bronze'],
        issuer: baseurl,
        cookies: {
            long: { signed: true, maxAge: parseInt(optional('IAM_OIDC_MAXAGE'), 10) * 1000 || ((1 * 24 * 60 * 60) * 1000) }, // 1 day in ms
            short: { signed: true },
            keys: [`${getPassword('IAM_SESSION_COOKIE_SECRET')}`],
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
                'roles',
                'tenant',
                // 'memberships',
                'permissions',
                // 'currentContext',
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
            encryption: true,
            frontchannelLogout: true,
            introspection: true,
            request: true,
            revocation: true,
            sessionManagement: {
                // thirdPartyCheckUrl: 'https://mindmup.github.io/3rdpartycookiecheck/start.html',
            },
            claimsParameter: true,
            conformIdTokenClaims: false,
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
                ctx.oidc.client.applicationType === 'native'
              && ctx.oidc.params.response_type !== 'none'
              && !ctx.oidc.result) { // TODO: in 3.x require consent to be passed in results
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
            AuthorizationCode: optional('IAM_OIDC_TTL_AUTHCODE', 1 * 24 * 60 * 60), // 1 day in seconds,
            ClientCredentials: optional('IAM_OIDC_TTL_CLIENTCRED', 1 * 24 * 60 * 60), // 1 day in seconds,
            IdToken: optional('IAM_OIDC_TTL_IDTOKEN', 14 * 24 * 60 * 60), // 14 days in seconds
            RefreshToken: optional('IAM_OIDC_TTL_REFRESHTOKEN', 14 * 24 * 60 * 60), // 14 days in seconds
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

console.log(config.accounts.admin)
console.log(config.accounts.admin.password)
if (config.general.useHttps) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

module.exports = config;
