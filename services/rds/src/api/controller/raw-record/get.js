const rawRecordDAO = require('../../../dao/raw-record')
const { transformRecord, transformRecords } = require('./transform')

module.exports = {
  async getStatus(req, res, next) {
    try {
      res.json({
        data: {
          totalRecords: await rawRecordDAO.countByOwner(req.user),
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
    const page = Math.max(0, req.query.page || 0)
    const perPage = Math.max(0, req.query.perPage || 50)

    try {
      const [records, total] = await rawRecordDAO.findByOwner(
        req.user,
        perPage,
        page
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
