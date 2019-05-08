const uuid = require('uuid');

module.exports = async ({
    secret,
    // flow,
    // authClient,
    // tokenResponse,
}) => {
    secret.value.externalId = uuid.v4();
    return secret;
};
