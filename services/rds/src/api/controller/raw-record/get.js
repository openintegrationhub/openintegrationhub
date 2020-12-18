const rawRecordDAO = require('../../../dao/raw-record')
const transformResponse = require('../../transform-response')

module.exports = async (req, res, next) => {
  try {
    const result = await rawRecordDAO.findByOwnerAndId(
      req.user,
      req.params.rawRecordId
    )
    if (!result) return next({ status: 404, message: 'Raw record not found' })
    res.json(transformResponse(result))
  } catch (err) {
    next(err)
  }
}
