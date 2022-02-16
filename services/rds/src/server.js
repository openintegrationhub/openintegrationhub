/* eslint class-methods-use-this: 0 */

const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const swaggerUi = require('swagger-ui-express')
const { EventBus, RabbitMqTransport } = require('@openintegrationhub/event-bus')
const swaggerDocument = require('./api/_doc/swagger.json')
const { connectQueue, disconnectQueue } = require('./event/bus')
const config = require('./config')
const api = require('./api')

const logger = require('./logger')

class Server {
  constructor(
    mongodbUrl = config.mongodbUrl,
    customPort = config.port,
    Bus = EventBus,
    Transport = RabbitMqTransport
  ) {
    this.server = null
    this.mongodbUrl = mongodbUrl

    this.transport = new Transport({
      rabbitmqUri: config.queueUrl,
      logger,
    })

    this.eventBus = new Bus({
      transport: this.transport,
      logger,
      serviceName: config.name,
    })

    this.app = express()
    this.app.disable('x-powered-by')
    this.app.set('port', customPort)
  }

  async setup() {
    await this.setupDb()
    await this.setupQueue()
    this.setupCors()
    this.setupRoutes()
    this.setupSwagger()
  }

  setupDb() {
    return new Promise((resolve, reject) => {
      mongoose.connect(
        this.mongodbUrl,
        {
          poolSize: 50,
          connectTimeoutMS: 30000,
        },
        (err) => {
          if (err) return reject(err)
          // wait for index creation
          require('./model/raw-record').on('index', (error) => {
            if (error) {
              logger.error('RawRecord index error', error)
            } else {
              resolve()
            }
          })
        }
      )

      logger.info('Mongo Connection established')
    })
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
    logger.info('adding swagger api')
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

  async setupQueue() {
    await connectQueue(this.eventBus, this.transporter)
    logger.info('Connected to queue')
  }

  async terminateQueue() {
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
