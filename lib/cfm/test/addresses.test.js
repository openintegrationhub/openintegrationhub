/* eslint no-unused-expressions: "off" */
/* eslint max-len: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint no-unused-vars: "off" */

const CFM = require('../index'); // eslint-disable-line

// Setup CFM
const cfm = new CFM();

const globalRules = {
  skipDuplicateEntry: 'myRule1',
};

const rules = {
  rejectEmpty: ['title', 'birthday'],
  ifUpdate: ['specialKey', 'specialKey2'],
  uniqArray: ['contactData.[]'],
  copyNew: ['gender', 'addresses.[]'],
};

const contactDataResolver = function(valueA, valueB) { // eslint-disable-line

  let a;
  for (a in valueA) { // eslint-disable-line
    let b;
    for (b in valueB) { // eslint-disable-line
      // @todo: some smart logic to compare all entries
    }
  }

  if (valueA !== valueB) {
    return {
      value: valueA,
    };
  }
  return {
    value: valueB,
  };
};

// Some example data:
const person1 = {
  uid: '12345',
  firstName: 'Jane',
  lastName: 'Doe',
  middleName: 'Schmuck',
  // gender: 'w',
  birthday: '12.12.1912',
  notes: 'Premium customer',
  displayName: 'Jane Doe',
  language: 'en-US',
  nickname: 'JD',
  jobTitle: '',
  photo: '/example.jpg',
  lastUpdate: '223456',
  updateEvent: '1100',
  meta: {
    user: '1',
    tenant: '2',
    role: 'TESTER',
    username: 'John Worker',
  },
  addresses: [{
    uid: '54321',
    city: 'Hamburg',
  }],
  contactData: [{
    uid: '65432',
    type: 'Testtype',
    value: 'testval',
    description: 'some desc',
    contextRef: '12345abcd',
  }],
};

const person2 = {
  uid: '12345',
  firstName: 'Jane',
  lastName: 'Doe',
  // middleName: 'Schmuck',
  gender: 'female',
  birthday: '12.12.1972',
  notes: 'Premium customer, Is interested in XY.',
  displayName: 'Jane Doe',
  language: 'en-US',
  nickname: 'JD',
  jobTitle: '',
  photo: '/jane.jpg',
  lastUpdate: '123456',
  updateEvent: '1000',
  meta: {
    user: '1',
    tenant: '2',
    role: 'TESTER',
    username: 'John Worker',
  },
  addresses: [{
    uid: '54321',
    city: 'Hamburg',
  },
  {
    uid: '12345',
    city: 'OldTown',
  },
  ],
  contactData: [{
    uid: '65432',
    type: 'Testtype',
    value: 'testval',
    description: 'some desc',
    contextRef: '12345abcd',
  }],
};

// Start test
beforeAll(async () => {

});

afterAll(async () => {

});

describe('CFM Setup', () => {
  test('should succeed on setting valid global rules', async () => {
    const result = cfm.setGlobalRules(globalRules);
    expect(result).not.toBeNull();
    expect(result).not.toEqual(false);
  });

  test('should succeed on setting valid rules', async () => {
    const result = cfm.setRules(rules);
    expect(result).not.toBeNull();
    expect(result).not.toEqual(false);
  });

  test('should succeed on setting a custom rule that does not exist', async () => {
    // addCustomRule(name, resolvers)
    const result = cfm.addCustomRule('contactData', ['contactDataResolver']);
    expect(result).not.toBeNull();
    expect(result).toEqual(true);
  });

  test('should fail on setting a custom rule that does exist', async () => {
    // addCustomRule(name, resolvers)
    const result = cfm.addCustomRule('contactData', ['contactDataResolver']);
    expect(result).not.toBeNull();
    expect(result).toEqual(false);
  });

  test('should succeed on setting a custom resolver that does not exist', async () => {
    // addCustomRule(name, resolvers)
    const result = cfm.addCustomResolver('contactDataResolver', contactDataResolver);
    expect(result).not.toBeNull();
    expect(result).toEqual(true);
  });

  test('should fail on setting a custom resolver that does exist', async () => {
    // addCustomRule(name, resolvers)
    const result = cfm.addCustomResolver('contactDataResolver', contactDataResolver);
    expect(result).not.toBeNull();
    expect(result).toEqual(false);
  });
});

describe('CFM Resolve', () => {
  test('should return the correct resolution', async () => {
    // resolve(incoming, target)
    const result = cfm.resolve(person1, person2);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('firstName');
    expect(result).toHaveProperty('lastName');
    expect(result).toHaveProperty('jobTitle');
    expect(result).toHaveProperty('birthday');
    expect(result.firstName).toEqual('Jane');
    expect(result.lastName).toEqual('Doe');
    expect(result.jobTitle).toEqual('');
    expect(result.birthday).toEqual('12.12.1912');

    expect(result.middleName).toEqual('Schmuck');
    expect(result.gender).toEqual('female');

    expect(result).toHaveProperty('addresses');
    expect(result.addresses).toHaveLength(1);
    expect(result.addresses[0]).toHaveProperty('city');
    expect(result.addresses[0]).toHaveProperty('uid');

    expect(result).toHaveProperty('contactData');
    expect(result.contactData).toHaveLength(1);

    expect(result.contactData[0]).toHaveProperty('contextRef');
    expect(result.contactData[0]).toHaveProperty('description');
    expect(result.contactData[0]).toHaveProperty('type');
    expect(result.contactData[0]).toHaveProperty('uid');
    expect(result.contactData[0]).toHaveProperty('value');
    expect(result.contactData[0].contextRef).toEqual('12345abcd');
    expect(result.contactData[0].description).toEqual('some desc');
    expect(result.contactData[0].type).toEqual('Testtype');
    expect(result.contactData[0].uid).toEqual('65432');
    expect(result.contactData[0].value).toEqual('testval');
  });

  test('should return the correct global resolution if object is ident', async () => {
    // resolve(incoming, target)
    const result = cfm.resolve(person1, person1);
    expect(Object.entries(result).length).toEqual(0);
  });
});
