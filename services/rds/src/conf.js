const pjson = require('../package.json')

const DEFAULT_PORT = 3098

const { name } = pjson

module.exports = {
  name,
  apiBase: process.env.API_BASE || '/api/v1',
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || DEFAULT_PORT,
  mongodbConnection:
    process.env.MONGODB_CONNECTION || `mongodb://localhost:27017/${name}`,
}
