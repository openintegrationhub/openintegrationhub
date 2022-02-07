const faker = require('faker')

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min
}

module.exports = (amount = 1) => {
  const products = []
  for (let i = 0; i < amount; i++) {
    const product = {
      metadata: {
        recordUid: faker.datatype.uuid(),
      },
      data: {
        baseType: 'car',
        articleNo: faker.datatype.uuid(),
        ...(getRandomArbitrary(1, 10) >= 5
          ? {
              description: faker.vehicle.vehicle(),
            }
          : {}),
        costCalc: faker.datatype.float(),
        costAvg: faker.datatype.float(),
        isSale: faker.datatype.boolean(),
        isPurchase: faker.datatype.boolean(),
        isProduction: faker.datatype.boolean(),
        isStockItem: faker.datatype.boolean(),
        status: 'new',
        articleGroups: [
          {
            type: 'shop',
            code: faker.datatype.uuid(),
            description: faker.vehicle.type(),
          },
        ],
      },
    }
    products.push(product)
  }
  return products
}
