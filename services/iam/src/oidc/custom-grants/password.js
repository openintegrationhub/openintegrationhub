const passport = require('passport');
const epochTime = require('oidc-provider/lib/helpers/epoch_time');
const Account = require('../dao/account');
const { ROLES } = require('../../constants');

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
                const {
                    AccessToken,
                    IdToken,
                } = provider;

                const account = new Account(user);
 
                if (user.role === ROLES.SERVICE_ACCOUNT 
                    || user.role === ROLES.ADMIN) {

                    const at = new AccessToken({
                        accountId: account.data._id,
                        clientId: ctx.oidc.client.clientId,
                        grantId: ctx.oidc.uuid,
                        scope: ctx.oidc.params.scope,
                    });
    
                    const accessToken = await at.save();
    
                    const { expiresIn } = AccessToken;
                    const token = new IdToken(Object.assign({}, await account.claims(), {
                        auth_time: epochTime(),
                    }), ctx.oidc.client.sectorIdentifier);
                  
                    token.scope = ctx.oidc.params.scope;
                    token.set('sub', account.data._id);
                    token.set('at_hash', accessToken);
    
                    const idToken = await token.sign(ctx.oidc.client);
                    ctx.type = 'application/jwt; charset=utf-8';
                    ctx.body = {
                        access_token: accessToken,
                        id_token: idToken,
                        expires_in: expiresIn,
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

module.exports.handler = providerInstance => async function passwordGrantType(ctx, next) {
    ctx.req.body = ctx.oidc.body;

    await authenticate(providerInstance, ctx);

    await next();
};
