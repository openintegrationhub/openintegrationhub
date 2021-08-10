const express = require('express')
const iamLib = require('@openintegrationhub/iam-utils')
const errorHandler = require('./middleware/error')
const rawRecordController = require('./controller/raw-record')

const router = express.Router()

router.use(iamLib.middleware)

router.use('/raw-record', rawRecordController)

router.use(errorHandler)

module.exports = router
