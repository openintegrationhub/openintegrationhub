//const path = require('path');
//const _ = require('lodash');
const request = require('request-promise');
const config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const router = express.Router();

// Requests a token from the IAM service by posting username and password to the login endpoint
router.post('/', jsonParser, async (req, res) => {


  const options = {
    uri: (config.get('iamBaseUrl') + '/login'),
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    json: {
      username: req.body.username,
      password: req.body.password
      }
    };

    try{
      const response = await request(options);
      res.json(response);
    }
    catch(error){
      res.json(error.message);
    }

});

module.exports = router;
