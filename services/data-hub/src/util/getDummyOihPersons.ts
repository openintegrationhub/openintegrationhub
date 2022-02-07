import * as faker from 'faker';

interface Address {
    street: string;
    streetNumber: string;
    zipcode: string;
    city: string;
    region: string;
    country: string;
    countryCode: string;
}

interface ContactData {
    value: string;
    type: string;
}

interface MetaData {
    recordUid: string;
}

interface Data {
    firstName: string;
    lastName: string;
    photo: string;
    jobTitle: string;
    salutation: string;
    gender: string;
    birthday: string;
    displayName: string;
    middleName: string;
    nickname: string;
    contactData: ContactData[];
    addresses: Address[];
}

export interface Person {
    metadata: MetaData; 
    data: Data; 
} 

export default (amount = 1): Person[] => {
    const persons: Person[] = []
    for (let i = 0; i < amount; i++) {
        const person: Person = {
            metadata: {
                recordUid: faker.datatype.uuid()
            },
            data: {
                firstName: faker.name.firstName(),
                middleName: faker.name.firstName(),
                lastName: faker.name.lastName(),
                photo: faker.image.avatar(),
                jobTitle: faker.name.jobTitle(),
                salutation: faker.name.prefix(),
                gender: faker.name.gender(),
                birthday: faker.date.between('1970-01-01', '2000-01-01').toDateString(),
                displayName: faker.internet.userName(),
                nickname: faker.internet.userName(),
                contactData: ((): ContactData[] => {
                    const contactEmails: ContactData[] = []
                    const contactPhones: ContactData[] = []
                    const contactData: ContactData[] = []
                    // generate phone numbers
                    for (let i = 0; i < faker.datatype.number({ min: 1, max: 3 }); i++) {
                        const type = ["phone", "mobile", "fax"]
                        const contactPhone: ContactData = {
                            type: type[faker.datatype.number({ min: 0, max: 2 })],
                            value: faker.phone.phoneNumber()
                        }
                        contactPhones.push(contactPhone)
                    }
                    for (let i = 0; i < faker.datatype.number({ min: 1, max: 2 }); i++) {
                        const contactPhone: ContactData = {
                            type: "email",
                            value: faker.internet.email()
                        }
                        contactPhones.push(contactPhone)
                    }
                    return contactData.concat(contactEmails, contactPhones)   
                })(),
                addresses: ((): Address[] => {
                    const addresses: Address[] = []
                    // generate phone numbers
                    for (let i = 0; i < faker.datatype.number({ min: 1, max: 2 }); i++) {
                        const address: Address = {
                            street: faker.address.streetName(),
                            streetNumber: faker.datatype.number({ min: 1, max: 999 }).toString(),
                            zipcode: faker.address.zipCode(),
                            city: faker.address.cityName(),
                            region: faker.address.county(),
                            country: faker.address.country(),
                            countryCode: faker.address.countryCode()
                        }
                        addresses.push(address)
                    }
                    return addresses   
                })()
            }
        }
        persons.push(person)
    }
    return persons
}