const fetch = require('node-fetch');

module.exports = async ({ secret, tokenResponse }) => {
    const authToken = `Bearer ${tokenResponse.access_token}`;

    const response = await fetch('https://api.zoom.us/v2/users/me', {
        method: 'GET',
        headers: {
            Authorization: authToken,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    const resp = await response.json();

    secret.value.externalId = resp.id;

    return secret;
};
