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
  // ruleCopyAll: ['contactData.[]']: ,
  uniqArray: ['contactData.[]'],
  // contactData: ['contactData.[].value'],
};

// addCustomResolver(name, customFunction)
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
const data1 = {
  title: 'Dr.',
  firstName: 'Doe',
  contactData: [{
    type: 'email',
    value: 'abc@def.de',
  },
  {
    type: 'email',
    value: 'abc@tester.de',
  },
  ],
  iamNew: true,
  iamNew2: true,
  specialKey: 'New data',
  specialKey2: 'I am only in new!',
};

const data2 = {
  birthday: '1.1.1190',
  title: "'Prof.'",
  gender: 'male',
  contactData: [{
    type: 'telephone',
    value: '1234/56789',
  },
  {
    type: 'email',
    value: 'def@padihg.com',
  },
  {
    type: 'email',
    value: 'abc@def.de',
  },
  ],
  iamNew: false,
  specialKey: 'Old data',
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
    const result = cfm.resolve(data1, data2);

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('birthday');
    expect(result.title).toEqual('Dr.');
    expect(result.birthday).toEqual('1.1.1190');

    expect(result.gender).toEqual('male');
    expect(result.firstName).toEqual('Doe');

    expect(result).toHaveProperty('iamNew');
    expect(result).toHaveProperty('iamNew2');
    expect(result.iamNew).toEqual(false);
    expect(result.iamNew2).toEqual(true);

    expect(result).toHaveProperty('specialKey');
    expect(result.specialKey).toEqual('New data');

    expect(result).not.toHaveProperty('specialKey2');

    expect(result).toHaveProperty('contactData');
    expect(result.contactData).toHaveLength(4);

    expect(result.contactData[0]).toHaveProperty('type');
    expect(result.contactData[0]).toHaveProperty('value');
    expect(result.contactData[0].type).toEqual('telephone');
    expect(result.contactData[0].value).toEqual('1234/56789');

    expect(result.contactData[1]).toHaveProperty('type');
    expect(result.contactData[1]).toHaveProperty('value');
    expect(result.contactData[1].type).toEqual('email');
    expect(result.contactData[1].value).toEqual('def@padihg.com');

    expect(result.contactData[2]).toHaveProperty('type');
    expect(result.contactData[2]).toHaveProperty('value');
    expect(result.contactData[2].type).toEqual('email');
    expect(result.contactData[2].value).toEqual('abc@def.de');

    expect(result.contactData[3]).toHaveProperty('type');
    expect(result.contactData[3]).toHaveProperty('value');
    expect(result.contactData[3].type).toEqual('email');
    expect(result.contactData[3].value).toEqual('abc@tester.de');
  });


  test('should return the correct global resolution if object is ident', async () => {
    // resolve(incoming, target)
    const result = cfm.resolve(data1, data1);
    expect(Object.entries(result).length).toEqual(0);
  });
});
