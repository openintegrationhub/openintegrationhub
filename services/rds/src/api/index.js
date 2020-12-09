const express = require('express')
const iamLib = require('@openintegrationhub/iam-utils')
const errorHandler = require('./middleware/error')
const rawRecordController = require('./controller/raw-record')

const { can } = iamLib

const router = express.Router()

router.use(iamLib.middleware)

router.get('/raw-record/:id', can('foo'), rawRecordController)
router.use(errorHandler)

module.exports = router
