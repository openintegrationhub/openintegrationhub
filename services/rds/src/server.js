/**
 * Copyright (C) Basaas GmbH - All Rights Reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential.
 */

const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')

const config = require('./config')
const api = require('./api')

const log = require('./logger')

class Server {
  constructor(mongodbUrl = config.mongodbUrl, customPort = config.port) {
    this.server = null
    this.mongodbUrl = mongodbUrl
    this.mongoSession = null
    this.app = express()
    this.app.disable('x-powered-by')
    this.app.set('port', customPort)
  }

  async setup() {
    await mongoose.connect(this.mongodbUrl, {
      poolSize: 50,
      connectTimeoutMS: 30000,
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    log.info('Mongo Connection established')

    this.setupCors()
    this.setupRoutes()
  }

  setupCors() {
    this.corsOptions = {
      credentials: true,
      origin(origin, callback) {
        if (config.originWhitelist.find((elem) => origin.indexOf(elem) >= 0)) {
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

    this.app.use(config.apiBase, cors(this.corsOptions), api)
  }

  async start() {
    try {
      await this.setup()
      this.server = await this.app.listen(this.app.get('port'))
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
