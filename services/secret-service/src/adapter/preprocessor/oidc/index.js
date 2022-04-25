const jwt = require('jsonwebtoken');

module.exports = async ({
    secret,
    // flow,
    // authClient,
    tokenResponse,
}) => {
    secret.value.id_token = tokenResponse.id_token;
    secret.value.externalId = jwt.decode(tokenResponse.id_token).email;
    return secret;
};
