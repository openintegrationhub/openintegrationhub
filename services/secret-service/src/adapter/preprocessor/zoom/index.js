const rp = require('request-promise');

module.exports = async ({
    secret,
    tokenResponse,
}) => {
    const resp = await rp.get({
        uri: 'https://api.zoom.us/v2/users/me',
        headers: {
            Authorization: tokenResponse.access_token,
        },
        json: true,
    });

    secret.value.externalId = resp.id;
    secret.value.externalAccountId = resp.account_id;

    return secret;
};
