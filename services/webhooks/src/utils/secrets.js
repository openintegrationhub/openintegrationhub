const fetch = require('node-fetch');
const authenticateHmac = async (secretId,hmacHeader,rawBody) => {
  const response = await fetch(
    `${conf.secretservice.url}/secrets/${secretId}/validateHmac`,
    {
        headers: {
            'x-auth-type': 'basic',
            authorization: `Bearer ${conf.iam.token}`,
        },
        body: {
          hmacHeader,
          rawBody,
        }
    },
  );

  const body = await response.json();
  return body.key;
}

module.exports = { authenticateHmac };
