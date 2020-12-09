require('isomorphic-fetch')
const LRU = require('lru-cache')
const { v4 } = require('uuid')
const conf = require('./conf')

const log = require('../logger')

const tokenCache = new LRU({
  max: 50,
  maxAge: 1000 * 60 * 5,
})

module.exports = {
  async createEphemeralLynxToken(accountId) {
    log.debug('creating ephemeral skm token for connector')

    const token = tokenCache.get(accountId)

    if (token) {
      log.debug(`Cache hit for account ${accountId}`)
      return token
    }

    const response = await fetch(`${conf.endpoints.iamApi}/tokens`, {
      method: 'post',
      body: JSON.stringify({
        accountId,
        expiresIn: '10m',
        inquirer: '5dc545fb77139886bfb553f7',
        customPermissions: ['lynx.secret.read.raw'],
        description: `${conf.name} token`,
      }),
      headers: {
        authorization: `Bearer ${conf.iam.token}`,
        'x-auth-type': 'basic',
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    tokenCache.set(accountId, data.token)
    // tokenCache.ttl(`${connectorId}:${accountId}`, parseInt(conf.iam.tokenCacheTTL, 10));
    return data.token
  },

  async fetchAccessToken(secretId, iamToken, requestId = v4()) {
    log.debug('Fetching secret')

    const response = await fetch(
      `${conf.endpoints.lynxApi}/secrets/${secretId}`,
      {
        method: 'get',
        headers: {
          'x-request-id': requestId,
          'x-auth-type': 'basic',
          authorization: `Bearer ${iamToken}`,
        },
      }
    )

    const { data } = await response.json()

    return data.value.accessToken
  },
}
