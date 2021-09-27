const { RequestHandlers } = require('@openintegrationhub/webhooks');
const { DEFAULT_HMAC_HEADER_KEY = 'x-hmac', DEFAULT_HMAC_ALGORITHM = 'sha265', WEBHOOK_EXECUTE_PERMISSION = 'webhooks.execute' } = process.env;
const { authenticateHmac } = require('../utils/secrets');
const { getUserData, hasAll } = require('@openintegrationhub/iam-utils');

class PostRequestHandler extends RequestHandlers.Post {
    /* constructor(req, res, messagePublisher) {
        super(req, res, messagePublisher);
        this.logger = this.getLogger();

    }

    async handle() {
        await this.authorize();
        super.handle();
    } */

    async authorize() {
        // Has the first node of the flow been configured to enforce authentication?
        const flow = this.getFlow();
        const flowSettings = flow.getFlowSettings();
        // Default to false if field doesn't exist
        const { requireWebhookAuth = false, hmacHeaderKey = DEFAULT_HMAC_HEADER_KEY, hmacAuthSecret, hmacAlgorithm = DEFAULT_HMAC_ALGORITHM } = flowSettings;
        if (!requireWebhookAuth) {
            this.logger.debug('Not authenticating the flow. requireAuthorization is not enabled');
            return;
        }

        const hmacHeaderValue = this._req.header(hmacHeaderKey);
        if  (hmacHeaderValue) {
          const success = await authenticateHmac(hmacAuthSecret,hmacHeaderValue,hmacAlgorithm,this._req.rawBody);
          if (success) {
            return;
          } else {
            this.sendPermissionsError();
          }
        }

        const authHeader = this._req.header('authorization');
        if (authHeader) {
          const headerArray = authHeader.split(' ');
          switch (headerArray[0]) {
            case 'Bearer': {
              const user = getUserData({ token: headerArray[1], introspectType: this._req.headers['x-auth-type'] });
              if (!hasAll({ user, requiredPermissions:WEBHOOK_EXECUTE_PERMISSION })) {
                this.sendPermissionsError();
              }
              break;
            }
            case 'Basic': {
              //var [user,pass] = new Buffer.from(headerArray[1], 'base64').toString().split(':');
              this.sendPermissionsError();
              break;
            }
            default:
              return false;
          }
          return;
        }
    }

    sendPermissionsError() {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }
}
module.exports.PostRequestHandler = PostRequestHandler;
