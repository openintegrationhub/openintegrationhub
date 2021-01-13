const express = require('express')
const iamLib = require('@openintegrationhub/iam-utils')
const errorHandler = require('./middleware/error')
const getRawRecord = require('./controller/raw-record/get')

const { can } = iamLib
const { common } = iamLib.PERMISSIONS

const router = express.Router()

router.use(iamLib.middleware)

router.get(
  '/raw-record/:rawRecordId',
  can(common['rds.rawRecord.read']),
  getRawRecord
)

router.use(errorHandler)

module.exports = router
