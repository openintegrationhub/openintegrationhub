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
    },
    payload: {
      type: String,
      required: true,
    },
    owners: { type: [owner] },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model(`rawRecord`, rawRecord)
