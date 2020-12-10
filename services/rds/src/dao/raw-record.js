const RawRecord = require('../model/raw-record')

module.exports = {
  async create(userId, rawRecordId, payload) {
    const rawRecord = new RawRecord({
      rawRecordId,
      payload,
      ...(userId
        ? {
            owners: [
              {
                id: userId,
                type: 'USER',
              },
            ],
          }
        : {}),
    })
    return rawRecord.save()
  },

  async findByOwnerAndId(user, rawRecordId) {
    const record = await RawRecord.findOne(
      {
        rawRecordId,
      },
      'rawRecordId payload owners'
    ).lean()

    if (!record) return null

    if (record.owners.length) {
      if (!record.owners.find((e) => e.id === user.sub && e.type === 'USER')) {
        return null
      }
    }

    return record
  },
}
