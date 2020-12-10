const { required, optional } = require('./check-env')
const pjson = require('../../package.json')

const DEFAULT_PORT = 3000

const { name, version } = pjson

const originwhitelist = optional('CORS_ORIGIN_WHITELIST')
  ? optional('CORS_ORIGIN_WHITELIST').split(',')
  : []

module.exports = {
  name,
  version,
  apiBase: optional('API_BASE', '/api/v1'),
  nodeEnv: required('NODE_ENV'),
  port: optional('PORT', DEFAULT_PORT),
  originWhitelist: originwhitelist.concat(
    required('NODE_ENV') !== 'production'
      ? [
          // development only
          '127.0.0.1',
          'localhost',
        ]
      : []
  ),
  queueUrl: optional('QUEUE_URL', 'amqp://guest:guest@rabbitmq'),
  mongodbUrl: optional('MONGODB_URL', 'mongodb://localhost'),
}
