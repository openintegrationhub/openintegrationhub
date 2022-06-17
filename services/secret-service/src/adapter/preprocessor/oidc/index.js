const jwt = require('jsonwebtoken');

module.exports = async ({
    secret,
    // flow,
    // authClient,
    tokenResponse,
}) => {
    secret.value.externalId = tokenResponse.id_token;
    return secret;
};
