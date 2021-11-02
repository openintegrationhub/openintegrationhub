const RawRecord = require('../model/raw-record')

module.exports = {
  async create(userId, tenant, rawRecordId, payload) {
    const rawRecord = new RawRecord({
      rawRecordId,
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
      ...(tenant
        ? {
            tenant,
          }
        : {}),
      payload,
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

  async findByTenant(tenant, perPage = 50, page = 1) {
    const condition = {
      tenant,
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

  async countByTenant(tenant) {
    const condition = {
      tenant,
    }
    return RawRecord.countDocuments(condition)
  },

  async count() {
    return RawRecord.countDocuments()
  },
}
