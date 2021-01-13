const log = require('../logger')

module.exports.required = (env) => {
  if (process.env[env]) {
    return process.env[env]
  }
  log.error(`Missing required ${env}`)
  process.exit(1)
  return null
}

module.exports.optional = (env, defaultValue) => {
  if (process.env[env]) {
    return process.env[env]
  }
  return defaultValue
}
