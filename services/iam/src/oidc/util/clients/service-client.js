const { optional } = require('../../../util/check-env');

module.exports = {
    client_id: optional('IAM_SERVICE_CLIENT_ID', 'heimdal-service-client'),
    client_secret: optional('IAM_SERVICE_CLIENT_SECRET', 'password123!'),
    grant_types: ['client_credentials', 'password'],
    redirect_uris: [],
    response_types: [],
};
