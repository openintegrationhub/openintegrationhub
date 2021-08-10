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

  async findByOwner(user, perPage = 50, page = 1) {
    const condition = {
      'owners.id': user.sub,
    }

    return Promise.all([
      RawRecord.find(condition)
        .skip(perPage * page)
        .limit(perPage)
        .lean(),
      RawRecord.countDocuments(condition),
    ])
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

  async countByOwner(user) {
    const condition = {
      'owners.id': user.sub,
    }

    return RawRecord.countDocuments(condition)
  },
}
