const faker = require('faker')

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min
}

module.exports = (amount = 1) => {
  const persons = []
  for (let i = 0; i < amount; i++) {
    const person = {
      metadata: {
        recordUid: faker.datatype.uuid(),
      },
      data: {
        firstName: faker.name.firstName(),
        middleName: faker.name.firstName(),
        ...(getRandomArbitrary(1, 10) >= 5
          ? {
              lastName: faker.name.lastName(),
            }
          : {}),
        photo: faker.image.avatar(),
        jobTitle: faker.name.jobTitle(),
        salutation: faker.name.prefix(),
        gender: faker.name.gender(),
        birthday: faker.date.between('1970-01-01', '2000-01-01').toDateString(),
        displayName: faker.internet.userName(),
        nickname: faker.internet.userName(),
        contactData: (() => {
          const contactEmails = []
          const contactPhones = []
          // generate phone numbers
          for (let j = 0; j < faker.datatype.number({ min: 1, max: 3 }); j++) {
            const type = ['phone', 'mobile', 'fax']
            const contactPhone = {
              type: type[faker.datatype.number({ min: 0, max: 2 })],
              value: faker.phone.phoneNumber(),
            }
            contactPhones.push(contactPhone)
          }
          for (let j = 0; j < faker.datatype.number({ min: 1, max: 2 }); j++) {
            const contactPhone = {
              type: 'email',
              value: faker.internet.email(),
            }
            contactPhones.push(contactPhone)
          }
          return [].concat(contactEmails, contactPhones)
        })(),
        addresses: (() => {
          const addresses = []
          // generate phone numbers
          for (let j = 0; j < faker.datatype.number({ min: 1, max: 2 }); j++) {
            const address = {
              street: faker.address.streetName(),
              streetNumber: faker.datatype
                .number({ min: 1, max: 999 })
                .toString(),
              zipcode: faker.address.zipCode(),
              city: faker.address.cityName(),
              region: faker.address.county(),
              country: faker.address.country(),
              countryCode: faker.address.countryCode(),
            }
            addresses.push(address)
          }
          return addresses
        })(),
      },
    }
    persons.push(person)
  }
  return persons
}
