const { isAdmin, isTenantAdmin } = require('@openintegrationhub/iam-utils')
const rawRecordDAO = require('../../../dao/raw-record')
const { transformRecord, transformRecords } = require('./transform')

module.exports = {
  async getStatus(req, res, next) {
    const { tenant } = req.query

    if (!isAdmin(req.user) && !isTenantAdmin(req.user)) {
      return next({ status: 401 })
    }

    if (tenant) {
      if (req.user.tenant !== tenant) {
        if (!isAdmin(req.user)) {
          return next({ status: 401 })
        }
      }
    }

    try {
      let totalRecords = 0
      if (tenant) {
        totalRecords = await rawRecordDAO.countByTenant(tenant)
      } else if (isTenantAdmin(req.user)) {
        totalRecords = await rawRecordDAO.countByTenant(req.user.tenant)
      } else {
        totalRecords = await rawRecordDAO.count(req.user)
      }

      res.json({
        data: {
          totalRecords,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async getByRawRecordId(req, res, next) {
    try {
      const record = await rawRecordDAO.findByOwnerAndId(
        req.user,
        req.params.rawRecordId
      )
      if (!record) return next({ status: 404, message: 'Raw record not found' })

      res.json({
        data: transformRecord(record),
      })
    } catch (err) {
      next(err)
    }
  },

  async getMany(req, res, next) {
    let { tenant } = req.query
    const page = Math.max(1, req.query.page || 0)
    const perPage = Math.max(0, req.query.perPage || 50)

    if (!isAdmin(req.user) && !isTenantAdmin(req.user)) {
      return next({ status: 401 })
    }

    if (tenant) {
      if (req.user.tenant !== tenant) {
        if (!isAdmin(req.user)) {
          return next({ status: 401 })
        }
      }
    } else {
      tenant = req.user.tenant
    }

    try {
      const [records, total] = await rawRecordDAO.findByTenant(
        tenant,
        perPage,
        page - 1
      )

      const meta = {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      }

      res.json({
        data: transformRecords(records),
        meta,
      })
    } catch (err) {
      next(err)
    }
  },
}
