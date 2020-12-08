const mongoose = require('mongoose')

const { Schema } = mongoose
const { Mixed, ObjectId } = Schema

const rawRecord = new Schema(
  {
    _id: {
      type: ObjectId,
      required: true,
    },
    payload: {
      type: Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model(`rawRecord`, rawRecord)
