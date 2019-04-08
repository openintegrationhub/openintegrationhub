const rp = require('request-promise');

module.exports = async (tokens) => {
    let resp = await rp.get({
        uri: 'https://api.atlassian.com/oauth/token/accessible-resources',
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
        },
        json: true,
    });


    resp = await rp.get({
        uri: `https://api.atlassian.com/ex/jira/${resp[0].id}/rest/api/3/myself`,
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
        },
        json: true,
    });

    return resp.emailAddress;
};
