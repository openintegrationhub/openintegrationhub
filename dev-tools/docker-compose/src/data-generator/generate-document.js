const faker = require('faker')

module.exports = (amount = 1) => {
  const documents = []
  for (let i = 0; i < amount; i++) {
    const document = {
      metadata: {
        recordUid: faker.datatype.uuid(),
      },
      data: {
        documentId: faker.datatype.uuid(),
        description: faker.datatype.string(),
        filesize: `${faker.datatype.number()} KB`,
        name: faker.datatype.string(),
      },
    }
    documents.push(document)
  }
  return documents
}
