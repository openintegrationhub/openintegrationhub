const Provider = require('oidc-provider');
const { set } = require('lodash');
const cors = require('cors');
const bodyParser = require('body-parser');
const Logger = require('@basaas/node-logger');
const path = require('path');
const fs = require('fs');
// const Provider = require('../../../node-oidc-provider/lib');
const { getKeystoreFile } = require('../util/keystore');
const passwordGrant = require('./custom-grants/password');
const conf = require('../conf');
const getSessionIframe = require('./session-iframe');
const Account = require('./dao/account');
const auth = require('../util/auth');

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/oidc`, {
    level: 'debug',
});

const readClientsFromJSON = (file) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, file)));
    } catch (err) {
        //
        return [];
    }
};

module.exports.createOIDCProvider = async () => {
    conf.oidc.findById = Account.findById;

    const provider = new Provider(conf.oidc.issuer, conf.oidc);

    provider.defaultHttpOptions = { timeout: 15000 };

    // add custom grant type
    provider.registerGrantType('password', passwordGrant.handler, passwordGrant.parameters);

    // add custom clients for debug only
    const clients = conf.general.debug ? readClientsFromJSON('util/clients/clients.json') : [];

    // service client
    clients.push(conf.oidc.serviceClient);

    const keystoreFile = await getKeystoreFile();

    provider.use(async (ctx, next) => {
        await next();
        if (
            ctx.method !== 'OPTIONS' 
            && ctx._matchedRouteName === 'introspection'
            && ctx.oidc.entities.AccessToken
        ) {
            try {
                const acc = await Account.findById(ctx, ctx.oidc.entities.AccessToken.accountId);
                ctx.body.claims = acc.claims();
            } catch (err) {
                console.log(err);
            }
        }
    });

    await provider.initialize({
        adapter: require('./adapters/mongodb'), // eslint-disable-line global-require
        keystore: keystoreFile, // eslint-disable-line global-require
        clients,
    });

    log.info('OIDC provider started');

    if (!conf.oidc.useHttps) {
        provider.proxy = true;
    }

    provider.app.keys = ['some secret key', 'and also the old one'];

    // setup session iframe
    provider.app.middleware.unshift(async (ctx, next) => {
        await next();
        const debug = ctx.query.debug !== undefined;
        if (ctx._matchedRouteName === 'check_session') {
            ctx.body = getSessionIframe(debug, provider.cookieName('state'));
        }
    });

    if (!conf.general.debug) {
        provider.app.proxy = true;
        set(conf.oidc, 'cookies.short.secure', true);
        set(conf.oidc, 'cookies.long.secure', true);
    }

    return provider;
     
};

module.exports.addOIDCRoutes = async (app, provider, corsOptions) => {
    const parse = bodyParser.urlencoded({ extended: false });
    
    app.set('views', path.resolve(__dirname, '../views'));
    app.set('view engine', 'pug');

    app.get(`/${conf.oidc.base}/interaction/:grant`, async (req, res, next) => {
        try {
            const details = await provider.interactionDetails(req);
            const client = await provider.Client.find(details.params.client_id);

            const view = (() => {
                if (details.params.client_id.includes('basaas-native')) {
                    switch (details.interaction.reason) {
                        case 'consent_prompt':
                        case 'client_not_authorized':
                            return 'interaction';
                        default:
                            return 'app-login';
                    }
                } else {
                    switch (details.interaction.reason) {
                        case 'consent_prompt':
                        case 'client_not_authorized':
                            return 'interaction';
                        default:
                            return 'login';
                    }
                }         
            })();
            res.render(view, {
                client,
                details,
                conf,
            });
        } catch (err) {
            next(err);
        }
       
    });

    app.post(`/${conf.oidc.base}/interaction/:grant/confirm`, parse, async (req, res, next) => {
        try {
            await provider.interactionFinished(req, res, {
                consent: {},
            });
        } catch (err) {
            next(err);
        }
    });
  
    app.post(`/${conf.oidc.base}/interaction/:grant/login`, parse, auth.authenticate, async (req, res, next) => {
        const account = new Account(req.user);
        if (account.data.status !== 'ACTIVE') { 
            next(new Error('Account inactive'));
        } else {
            try {
                await provider.interactionFinished(req, res, {
                    login: {
                        account: account.accountId,
                        acr: '1',
                        remember: !!req.body.remember,
                        ts: Math.floor(Date.now() / 1000),
                    },
                    consent: {
                        // TODO: remove offline_access from scopes if remember is not checked
                    },
                });
            } catch (err) {
                next(err);
            }
        }
    });

    app.use(`/${conf.oidc.base}/`, cors(corsOptions), provider.callback);
     
};

