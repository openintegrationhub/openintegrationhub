'use strict';

const path = require('path');
const SwaggerExpress = require('swagger-express-mw');
const express = require('express');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');

const app = express();

const mongoose = require('mongoose');

// Configure MongoDB
// Use the container_name, bec containers in the same network can communicate using their service name
const mongoDB = 'mongodb://mongo:27017/icr';
mongoose.connect(mongoDB);

// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
const db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Configure the Swagger-API
var config = {
  appRoot: __dirname, // required config
};

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  // Add swagger-ui (This must be before swaggerExpress.register)
  app.use(SwaggerUi(swaggerExpress.runner.swagger));

  // install middleware
  swaggerExpress.register(app);

  app.get('/api-docs', (req, res) => {
      res.set('Content-Type', 'text/yaml')
      res.sendFile(path.join(__dirname, 'api/swagger/swagger.yaml'))
  })

  app.get('/docs', (req, res, next) => {
      if (!req.query.url) {
        const query = req.query
        query.url = '/api-docs'
        res.redirect(301, url.format({ query }))
        return
      }
      next()
  })

  // Error handler
  app.use((err, req, res, next) => {
    if (err.message === 'Validation errors') {
      res.statusCode = err.statusCode
      res.json({
        message: 'Error',
        errors: err.errors
      })
      next()
      return
    }

    next(err)
  })

  var port = process.env.PORT || 3001;
  app.listen(port);

});
