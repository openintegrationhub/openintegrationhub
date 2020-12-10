/**
 * Copyright (C) Basaas GmbH - All Rights Reserved.
 * Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential.
 */

const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const swaggerUi = require('swagger-ui-express')

const swaggerDocument = require('./api/_doc/swagger.json')
const { connectQueue, disconnectQueue } = require('./event/bus')
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
    await this.setupQueue()
    this.setupCors()
    this.setupRoutes()
    this.setupSwagger()
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

  setupSwagger() {
    log.info('adding swagger api')
    // Configure the Swagger-API
    /*eslint-disable */
    var config = {
      appRoot: __dirname, // required config

      // This is just here to stop Swagger from complaining, without actual functionality

      swaggerSecurityHandlers: {
        Bearer: function (req, authOrSecDef, scopesOrApiKey, cb) {
          if (true) {
            cb();
          } else {
            cb(new Error('access denied!'));
          }
        }
      }
    };
    /* eslint-enable */

    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, { explorer: true })
    )
  }

  async setupQueue() {  // eslint-disable-line
    await connectQueue()
    log.info('Connected to queue')
  }

  async terminateQueue() {  // eslint-disable-line
    await disconnectQueue()
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
    await this.terminateQueue()
    await mongoose.connection.close()
  }
}

module.exports = Server
