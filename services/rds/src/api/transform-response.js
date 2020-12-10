module.exports = (data) => {
  const transformed = { ...data }
  delete transformed._id
  return {
    data: transformed,
    meta: {},
  }
}
