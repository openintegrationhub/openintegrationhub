const express = require('express')

const getRouter = require('./notification')

const router = express.Router()

router.use(getRouter)

module.exports = router
