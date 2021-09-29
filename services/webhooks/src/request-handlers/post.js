const { RequestHandlers } = require('@openintegrationhub/webhooks');
const { DEFAULT_HMAC_HEADER_KEY = 'x-hmac', DEFAULT_HMAC_ALGORITHM = 'sha265', WEBHOOK_EXECUTE_PERMISSION = 'webhooks.execute' } = process.env;
const { authenticateHmac } = require('../utils/secrets');
const { login } = require('../utils/iam');
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
        const flowUser = flow.getFlowUser();
        // Default to false if field doesn't exist
        const { requireWebhookAuth = false, hmacHeaderKey = DEFAULT_HMAC_HEADER_KEY, hmacAuthSecret, hmacAlgorithm = DEFAULT_HMAC_ALGORITHM } = flowSettings;
        if (!requireWebhookAuth) {
            this.logger.debug('Not authenticating the flow. requireAuthorization is not enabled');
            return;
        }

        const hmacHeaderValue = this._req.header(hmacHeaderKey);
        if  (hmacHeaderValue) {
          const success = await authenticateHmac(hmacAuthSecret,hmacHeaderValue,hmacAlgorithm,flowUser,this._req.rawBody);
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
              await this.checkPermissions(headerArray[1]);
              break;
            }
            case 'Basic': {
              // Decode the user/pass combination and login to the system to check user permissions
              const authString = new Buffer.from(headerArray[1], 'base64').toString();
              const splitIndex = authString.indexOf(':');
              const user = authString.substring(0,splitIndex);
              const pass = authString.substring(splitIndex+1);
              const token = await login(user,pass);
              await this.checkPermissions(token);
              break;
            }
            default:
              return false;
          }
          return;
        }
    }

    async checkPermissions(token) {
      const user = await getUserData({ token, introspectType: this._req.headers['x-auth-type'] });
      if (!hasAll({ user, requiredPermissions:WEBHOOK_EXECUTE_PERMISSION })) {
        this.sendPermissionsError();
      }

    }

    sendPermissionsError() {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }
}
module.exports.PostRequestHandler = PostRequestHandler;
