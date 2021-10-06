const passport = require('passport');
const epochTime = require('oidc-provider/lib/helpers/epoch_time');
const Account = require('../dao/account');

const { ROLES } = require('../../constants');
const { resolveUserPermissions } = require('../../util/tokens');
const { PERMISSIONS, RESTRICTED_PERMISSIONS } = require('../../access-control/permissions');

function authenticate(provider, ctx) {
    return new Promise((resolve) => {
        passport.authenticate('local', async (err, user, info) => {
            if (err || !user || info) {
                ctx.body = {
                    error: 'invalid_grant',
                    error_description: 'invalid username or password provided',
                };
                ctx.status = 400;
            } else {
                const { AccessToken, IdToken } = provider;

                user = await resolveUserPermissions(user);

                const account = new Account(user);

                if (user.permissions && user.permissions.indexOf(RESTRICTED_PERMISSIONS.all) >= 0) {
                    const at = new AccessToken({
                        accountId: account.data._id,
                        clientId: ctx.oidc.client.clientId,
                        grantId: ctx.oidc.uuid,
                        scope: ctx.oidc.params.scope || 'global',
                    }, ctx.oidc.client);
    
                    const accessToken = await at.save();

                    const token = new IdToken(({ ...await account.claims(), auth_time: epochTime() }), ctx.oidc.client);

                    token.scope = ctx.oidc.params.scope || 'global';
                    token.set('sub', account.data._id);
                    token.set('at_hash', accessToken);
                    
                    const idToken = await token.sign({});

                    ctx.type = 'application/jwt; charset=utf-8';
                    ctx.body = {
                        access_token: accessToken,
                        id_token: idToken,
                        expires_in: AccessToken.expiresIn(),
                        token_type: 'Bearer',
                    };
                } else {
                    ctx.body = {
                        error: 'invalid_grant',
                        error_description: 'invalid permission',
                    };
                    ctx.status = 400;
                }              

            }
            resolve();
        })(ctx.req, ctx.res);
    });
}

module.exports.parameters = ['username', 'password'];

module.exports.handler = (providerInstance) => async function passwordGrantType(ctx, next) {
    ctx.req.body = ctx.oidc.body;

    await authenticate(providerInstance, ctx);

    await next();
};
