const { RequestHandlers } = require('@openintegrationhub/webhooks');
const { DEFAULT_HMAC_HEADER_KEY = 'x-hmac', DEFAULT_HMAC_ALGORITHM = 'sha265', WEBHOOK_EXECUTE_PERMISSION = 'webhooks.execute' } = process.env;
const fetch = require('node-fetch');
const iamUtils = require('@openintegrationhub/iam-utils');

class PostRequestHandler extends RequestHandlers.Post {
    constructor(req, res, messagePublisher, config) {
        super(req, res, messagePublisher);
        this.logger = this.getLogger();
        this._config = config;
    }

    /* async handle() {
        await this.authorize();
        super.handle();
    } */

    async authorize() {
        // Has the first node of the flow been configured to enforce authentication?
        let flow = this.getFlow();
        const flowSettings = flow.getFlowSettings();
        const flowUser = flow.getFlowUser();

        // Normalize Owner Types for sending to iam-utils GH #1422 TODO: Normalize constants, then remove this line
        flow.owners.forEach(x => ("type" in x) ? x.type = x.type.toUpperCase(): null);
        // Default to false if field doesn't exist
        const { requireWebhookAuth = false, hmacHeaderKey = DEFAULT_HMAC_HEADER_KEY, hmacAuthSecret, hmacAlgorithm = DEFAULT_HMAC_ALGORITHM, allTenantUsers=false } = flowSettings;
        if (!requireWebhookAuth) {
            this.logger.debug('Not authenticating the flow. requireAuthorization is not enabled');
            return;
        }

        const hmacHeaderValue = this._req.header(hmacHeaderKey);
        if  (hmacHeaderValue) {
          const success = await this.authenticateHmac(hmacAuthSecret,hmacHeaderValue,hmacAlgorithm,flowUser,this._req.rawBody);
          if (success) {
            return;
          } else {
            this.sendPermissionsError();
          }
        }

        const authHeader = this._req.header('authorization');
        if (authHeader) {
          const headerArray = authHeader.split(' ');
          let hasPermissions = false;
          switch (headerArray[0]) {
            case 'Bearer': {
              hasPermissions = await this.checkPermissions({ token:headerArray[1], flow, allTenantUsers });
              break;
            }
            case 'Basic': {
              // Decode the user/pass combination and login to the system to check user permissions
              const authString = new Buffer.from(headerArray[1], 'base64').toString();
              const splitIndex = authString.indexOf(':');
              const user = authString.substring(0,splitIndex);
              const pass = authString.substring(splitIndex+1);
              const token = await this.login(user,pass);
              hasPermissions = await this.checkPermissions({ token, flow, allTenantUsers });
              break;
            }
            default:
              break;
          }
          if (!hasPermissions) {
            this.sendPermissionsError();
          } else {
            return true;
          }
        }
        this.sendPermissionsError();
    }

    async checkPermissions({ token, flow, allTenantUsers }) {
      try {
        const user = await iamUtils.getUserData({ token, introspectType: this._req.headers['x-auth-type'] });
        return (iamUtils.hasAll({ user, requiredPermissions:WEBHOOK_EXECUTE_PERMISSION }) &&
          iamUtils.isOwnerOf({entity: flow, user, allTenantUsers }));
      }
      catch (e) {
        this.logger.info('Error authorizing webhook: ',e)
        return false;
      }
    }

    sendPermissionsError() {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }

    async login( username, password) {
      const body = {
        username,
        password,
      };
      const response = await fetch(
        `${this._config.get('IAM_BASE_URL')}/login`,
        {
            method: 'post',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'},
        },
      );

      const data = await response.json();
      return data.token;
    }

    async authenticateHmac(secretId, hmacHeader, hmacAlgo, userId, rawBody) {

      const iamClient = iamUtils.createClient({
        iamToken: this._config.get('IAM_TOKEN'),
        baseUrl: this._config.get('IAM_BASE_URL')
      });

      const { id: tokenId, token } = await iamClient.createToken({
        accountId: userId,
        expiresIn: '5m',
        description: 'Created to test HMAC for webhook',
        forceNew: true,
      });
      // get user token, then use that token in the fetch
      const response = await fetch(
        `${this._config.get('SECRET_SERVICE_URL')}/secrets/${secretId}/validateHmac`,
        {
            headers: {
                'x-auth-type': 'basic',
                authorization: `Bearer ${token}`,
            },
            body: {
              hmacHeader,
              hmacAlgo,
              rawBody,
            }
        },
      );

      // This *should* be an await statement, but we don't care about the return
      iamClient.deleteTokenById(tokenId);

      const body = await response.json();
      return body.data;
    }
}
module.exports.PostRequestHandler = PostRequestHandler;
