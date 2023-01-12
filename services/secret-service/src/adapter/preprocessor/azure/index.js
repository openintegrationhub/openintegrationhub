const jwt = require('jsonwebtoken');

module.exports = async ({
    secret,
    // flow,
    // authClient,
    tokenResponse,
}) => {
    // Need to request oidc and profile scopes to get the correct properties.
    const payload = jwt.decode(tokenResponse.id_token);
    secret.value.externalId = payload.preferred_username;
    return secret;
};
