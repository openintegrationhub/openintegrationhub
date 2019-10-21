const jwt = require('jsonwebtoken');

module.exports = async ({
    secret,
    // flow,
    // authClient,
    tokenResponse,
}) => {
    secret.value.externalId = jwt.decode(tokenResponse.id_token).email;
    return secret;
};
