module.exports = async ({
    secret,
}) => {
    secret.value.externalId = 'fooo';
    return secret;
};
