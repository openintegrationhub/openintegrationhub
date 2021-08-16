const express = require('express')
const iamLib = require('@openintegrationhub/iam-utils')
const { getByRawRecordId, getMany, getStatus } = require('./get')

const { can } = iamLib
const { common } = iamLib.PERMISSIONS

const router = express.Router()

router.get('/', can(common['rds.rawRecord.read']), getMany)
router.get('/status', getStatus)
router.get('/:rawRecordId', can(common['rds.rawRecord.read']), getByRawRecordId)

module.exports = router
