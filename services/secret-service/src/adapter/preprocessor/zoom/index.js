const rp = require('request-promise');

module.exports = async ({ secret, tokenResponse }) => {
    const authToken = `Bearer ${tokenResponse.access_token}`;
    const resp = await rp.get({
        uri: 'https://api.zoom.us/v2/users/me',
        headers: {
            Authorization: authToken,
        },
        json: true,
    });

    secret.value.externalId = resp.id;

    return secret;
};
