/**
 * Copyright (C) Basaas GmbH - All Rights Reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential.
 */

const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')

const {
  name,
  port,
  originWhitelist,
  mongodbConnection,
  apiBase,
} = require('./conf')
const errorHandler = require('./middleware/error')

const infolog = logger.getLogger(name, {
  level: 'info',
})

class Server {
  constructor(customMongoUri = mongodbConnection, customPort = port) {
    this.server = null
    this.mongoUri = customMongoUri
    this.mongoSession = null
    this.app = express()
    this.app.disable('x-powered-by')
    this.app.set('port', customPort)
  }

  async setup() {
    await mongoose.connect(this.mongoUri, {
      poolSize: 50,
      connectTimeoutMS: 30000,
      keepAlive: 120,
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true,
    })

    infolog.log('Mongo Connection established')

    this.setupCors()
    this.setupRoutes()
  }

  setupCors() {
    this.corsOptions = {
      credentials: true,
      origin(origin, callback) {
        if (originWhitelist.find((elem) => origin.indexOf(elem) >= 0)) {
          callback(null, true)
        } else {
          callback(null, false)
        }
      },
    }

    this.app.use((req, res, next) => {
      req.headers.origin = req.headers.origin || req.headers.host
      next()
    })
  }

  setupRoutes() {
    this.app.use('/healthcheck', (req, res) => {
      res.sendStatus(200)
    })

    const router = express.Router()
    router.use(iamLib.middleware)
    router.use('/raw-record', require('./route/raw-record'))
    this.app.use(apiBase, cors(this.corsOptions), router)
    this.app.use(errorHandler)
  }

  async start() {
    try {
      await this.setup()
      this.server = await this.app.listen(this.app.get('port'))
      infolog.info(`Webhook started`)
    } catch (error) {
      console.error(error)
    }
  }

  async stop() {
    this.server.close()
    await mongoose.connection.close()
  }
}

module.exports = Server
