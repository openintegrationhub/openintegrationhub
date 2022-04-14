const mongoose = require('mongoose')

const { Schema } = mongoose

const owner = new Schema({
  id: {
    type: String,
    required: [true, 'Owner require an id.'],
  },
  type: {
    type: String,
    required: [true, 'Owner require a type.'],
  },
  _id: false,
})

const rawRecord = new Schema(
  {
    rawRecordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: String,
      required: true,
    },
    tenant: String,
    owners: { type: [owner] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    autoCreate: process.env.NODE_ENV === 'test',
  }
)

module.exports = mongoose.model(`rawRecord`, rawRecord)
