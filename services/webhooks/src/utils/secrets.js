const fetch = require('node-fetch');
const authenticateHmac = async (secretId,hmacHeader,rawBody) => {
  const response = await fetch(
    `${conf.secretservice.url}/tenants/${parameter}/key`,
    {
        headers: {
            'x-auth-type': 'basic',
            authorization: `Bearer ${conf.iam.token}`,
        },
    },
  );

  const body = await response.json();
  return body.key;
}

module.exports = { authenticateHmac };
