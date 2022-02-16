
const cookieParser = require('cookie-parser');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { EventBusManager } = require('@openintegrationhub/event-bus');
const passport = require('passport');
// const cors = require('cors');

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

// eslint-disable-next-line
const LocalStrategy = require('passport-local').Strategy;

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const Logger = require('@basaas/node-logger');
const swaggerDocument = require('../../doc/openapi.json');

const jsonParser = bodyParser.json();

const CONSTANTS = require('../constants');
const conf = require('../conf');
const { createOIDCProvider, addOIDCRoutes } = require('../oidc');
const registerModels = require('../models/registerModels');
const Account = require('../models/account');
const Roles = require('../models/role');
const auth = require('../util/auth');
const { DEFAULT_ROLES } = require('../access-control/permissions');

const FORCE_SSL = conf.general.useHttps === 'true';

const log = Logger.getLogger(`${conf.general.loggingNameSpace}/app`, {
    level: 'debug',
});

/** passport config */

passport.use(Account.createStrategy());
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

const checkProto = (req, res, next) => {
    if (req.get('x-forwarded-proto') === 'http' && FORCE_SSL) {
        res.redirect(`https://${req.headers.host}${req.url}`);
    } else {
        next();
    }
};

class App {

    constructor(opts) {
        this.server = null;
        this.eventBus = opts && opts.eventBus;
        this.app = express();
        this.app.set('port', conf.general.port);
        this.app.disable('x-powered-by');
        this.mongoConnection = (opts && opts.mongoConnection) || conf.general.mongodb_url;
    }

    async setup() {

        this.mongoose = mongoose;

        await mongoose.connect(this.mongoConnection, {
            maxPoolSize: 50,
            connectTimeoutMS: 30000,
            keepAlive: 120,
        });

        EventBusManager.init({ eventBus: this.eventBus, serviceName: conf.general.loggingNameSpace });

        registerModels();
        this.setupCors();
        this.setupMiddleware();

        if (conf.general.authType === 'oidc') {
            await this.setupOidcProvider();
        }

        this.setupRoutes();
        await App.setupDefaultRoles();
        await App.createMasterAccount();

    }

    setupCors() {

        this.corsOptions = {
            credentials: true,
            origin(origin, callback) {
                if (conf.general.originWhitelist.find((elem) => origin.indexOf(elem) >= 0)) {
                    callback(null, true);
                } else {
                    log.info('Blocked by CORS');
                    log.info(origin);
                    log.info(conf.general.originWhitelist);
                    callback(new Error('Not allowed by CORS'));
                }
            },
        };

        this.app.use((req, res, next) => {
            req.headers.origin = req.headers.origin || req.headers.host;
            next();
        });

    }

    static userLanguageMiddleware(req, res, next) {
        req.__acceptedLAnguages = req.acceptsLanguages();
        next();
    }

    setupMiddleware() {
        this.app.use(cookieParser());

        const mongoSession = session({
            secret: process.env.IAM_SESSION_COOKIE_SECRET || 'Thi5Secret1sSoloelyForTestingOnly$',
            name: process.env.IAM_SESSION_COOKIE_NAME || 'basaas-iam',
            store: new MongoStore({
                mongooseConnection: this.mongoose.connection,
                touchAfter: 4 * 3600,
                autoRemove: 'native',
                autoRemoveInterval: 60 * 4, // Minutes!
                ttl: 3 * 24 * 60 * 60,
            }),
            saveUninitialized: false,
            resave: false,
        });

        this.app.use(mongoSession);
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        passport.use(new LocalStrategy(Account.authenticate()));
        passport.serializeUser(Account.serializeUser());
        passport.deserializeUser(Account.deserializeUser());

        this.app.use(App.userLanguageMiddleware);

    }

    async setupOidcProvider() {
        this.provider = await createOIDCProvider();
        addOIDCRoutes(this.app, this.provider, this.corsOptions);
    }

    setupRoutes() {

        this.app.use(jsonParser);

        // access log
        this.app.use(require('../log/access')); // eslint-disable-line global-require

        this.app.get('/healthcheck', (req, res) => {
            res.sendStatus(200);
        });

        this.app.use(checkProto);
        this.app.use('/', cors(this.corsOptions), require('../routes/general')); // eslint-disable-line global-require

        // setup SwaggerUI
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));

        const apiBase = express.Router();
        apiBase.use(auth.validateAuthentication);
        apiBase.use('/users', require('../routes/users')); // eslint-disable-line global-require
        apiBase.use('/tenants', require('../routes/tenants')); // eslint-disable-line global-require
        apiBase.use('/tokens', require('../routes/tokens')); // eslint-disable-line global-require
        apiBase.use('/roles', require('../routes/roles')); // eslint-disable-line global-require
        apiBase.use('/permissions', require('../routes/permissions')); // eslint-disable-line global-require

        // TODO: if the client is not a browser, no origin or host will be provided
        this.app.use(`/${conf.general.apiBase}`, cors(this.corsOptions), apiBase);

        // static files
        this.app.use('/static', express.static(path.join(__dirname, '../../static')));

        // 404 log
        this.app.use(require('../log/404')); // eslint-disable-line global-require

        // error log
        this.app.use(require('../log/error')); // eslint-disable-line global-require

        // error handling
        this.app.use(require('../routes/error').default); // eslint-disable-line global-require

    }

    static async createMasterAccount() {
        if (!await Account.countDocuments()) {
            const roles = await Roles.find({ isGlobal: true }).lean();
            const admin = new Account({
                username: conf.accounts.admin.username,
                firstname: conf.accounts.admin.firstname,
                lastname: conf.accounts.admin.lastname,
                // accountType: CONSTANTS.ROLES.ADMIN,
                roles: [{
                    _id: roles.find((role) => role.name === CONSTANTS.ROLES.ADMIN)._id,
                }],
                status: CONSTANTS.STATUS.ACTIVE,
            });

            await admin.setPassword(conf.accounts.admin.password);
            await admin.save();
        }
    }

    static async setupDefaultRoles() {
        if (!await Roles.countDocuments()) {

            const bulk = Object.entries(DEFAULT_ROLES).map(([key, value]) => ({
                name: key,
                permissions: value,
                isGlobal: true,
            }));

            await Roles.insertMany(bulk);

            log.info('Initial roles added');
        }
    }

    async start() {
        this.server = await this.app.listen(this.app.get('port'));
    }

    async startSecure() {
        const fs = require('fs'); // eslint-disable-line global-require
        const https = require('https'); // eslint-disable-line global-require
        const privateKey = fs.readFileSync(`${__dirname}/dev/dev.key.pem`, 'utf8');
        const certificate = fs.readFileSync(`${__dirname}/dev/dev.cert.pem`, 'utf8');

        const credentials = { key: privateKey, cert: certificate };
        const httpsServer = https.createServer(credentials, this.app);

        this.server = await httpsServer.listen(this.app.get('port'));
    }

    async stop() {
        if (this.server) {
            this.server.close();
            await EventBusManager.destroy();
        }
    }
}

module.exports = App;
