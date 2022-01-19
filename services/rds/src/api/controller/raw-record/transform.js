module.exports = {
  transformRecord(record) {
    const transformed = { ...record }
    delete transformed._id
    return transformed
  },
  transformRecords(records) {
    return records.map((record) => module.exports.transformRecord(record))
  },
}
