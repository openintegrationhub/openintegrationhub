const nock = require('nock');

const chunk1 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
        },
        lastName: {
          type: 'string',
          minLength: 1,
        },
        email: {
          type: 'string',
          minLength: 1,
        },
      },
      required: [
        'lastName',
        'firstName',
      ],
      additionalProperties: true,
    },
  },
  payload: {
    lastName: 'Doe',
    email: 'doe@mail.com',
  },
};

const chunk2 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
        },
        lastName: {
          type: 'string',
          minLength: 1,
        },
        email: {
          type: 'string',
          minLength: 1,
        },
      },
      required: [
        'lastName',
        'firstName',
      ],
      additionalProperties: true,
    },
  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk3 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'lastName',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'address',
  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk4 = {
  ilaId: 'asd4567',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'firstName',
  def: {
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
        },
        lastName: {
          type: 'string',
          minLength: 1,
        },
        email: {
          type: 'string',
          minLength: 1,
        },
      },
      required: [
        'lastName',
        'firstName',
      ],
      additionalProperties: true,
    },
  },
  payload: {
    lastName: 'Smith',
    email: 'smith@mail.com',
  },
};

const chunk5 = {
  ilaId: '',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'address',
  },
  payload: {
    lastName: 'Hobbs',
    firstName: 'jack',
    email: 'hobbs@mail.com',
  },
};

const chunk6 = {
  ilaId: '987asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'address',

  },
  payload: {
    lastName: 'Hobbs',
    firstName: 'Jack',
    email: 'hobbs@mail.com',
    birthday: '11.11.1990',
  },
};

const chunk7 = {
  ilaId: '567qwe',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
        },
        lastName: {
          type: 'string',
          minLength: 1,
        },
        email: {
          type: 'string',
          minLength: 1,
        },
      },
      required: [
        'lastName',
        'firstName',
      ],
      additionalProperties: true,
    },
  },
  payload: {
    lastName: 'Peterson',
    email: 'peterson@mail.com',
  },
};

const chunk8 = {
  ilaId: '567qwe',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
        },
        lastName: {
          type: 'string',
          minLength: 1,
        },
        email: {
          type: 'string',
          minLength: 1,
        },
      },
      required: [
        'lastName',
        'firstName',
      ],
      additionalProperties: true,
    },
  },
  payload: {
    lastName: 'Peterson',
    email: 'peterson@mail.com',
  },
};

const chunk9 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'lastName',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'address',

  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk10 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'lastName',
  def: {},
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk11 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'lastName',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schema: {},
  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk12 = {
  ilaId: '123asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'lastName',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'https://metadata.openintegrationhub.com',
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          minLength: 1,
        },
        lastName: {
          type: 'string',
          minLength: 1,
        },
        email: {
          type: 'string',
          minLength: 1,
        },
      },
      required: [
        'lastName',
        'firstName',
      ],
      additionalProperties: true,
    },
  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk13 = {
  ilaId: '987asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'address',
  },
  payload: {
    lastName: 'Hobbs',
    firstName: 'Jack',
    email: 'hobbs@mail.com',
  },
};

const chunk14 = {
  ilaId: '/987asd',
  token: 'WXYUFOmgDdoniZatfaMTa4Ov-An98v2-4668x5fXOoLZS',
  cid: 'email',
  def: {
    domainId: '5d3031a20cbe7c00115c7d8f',
    schemaUri: 'address',
  },
  payload: {
    lastName: 'Hobbs',
    firstName: 'Jack',
    email: 'hobbs@mail.com',
  },
};

const chunk15 = {
  ilaId: '003',
  token: '5_hOlcYSnI5rFw_YwNW6i4bh5C6XTBozZu0ljVUD-lim7ecMfNicsUqhmv4NMddr2Snegx9y18-oDfKXh8ODw9PHkwUpYXlKmRCg8RRnKBisAghNp0mGj3Ow-OxitXAA05gZ2jBVu2LuRIOD-eBdRKM6qR5fxs0SnZifSAA1hOU',
  cid: 'email',
  def: {
    schema: {
      type: 'object',
      properties: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'doe@mail.com',
        logo: 'string',
        address: 'payload',
      },
      required: [
        'lastName',
      ],
    },
  },
  payload: {
    first: 'John',
    email: 'mytest@email.com',
    logo: 'doe@mail.com',
    address: 'test',
  },
};

const createInvalidChunk = nock('http://metadata.openintegrationhub.com/api/v1/domains/5d3031a20cbe7c00115c7d8f/schemas/address')
  .get('')
  .reply(200, {
    data: {
      id: '5d305efa0cbe7c00115c7d96',
      refs: [],
      name: 'Addresses',
      domainId: '5d3031a20cbe7c00115c7d8f',
      description: 'Person Model',
      uri: '/api/v1/domains/5d3031a20cbe7c00115c7d8f/schemas/address',
      value: {
        $id: 'http://metadata.openintegrationhub.com/api/v1/domains/5d3031a20cbe7c00115c7d8f/schemas/address',
        firstName: 'string',
        lastName: 'string',
        email: 'string',
        birthday: 'string',
        required: [
          'lastName',
          'email',
          'birthday',
        ],
      },
      owners: [
        {
          id: '5d2da57e80304e0011388bfe',
          type: 'USER',
        },
        {},
      ],
      createdAt: '2019-07-18T11:58:50.747Z',
      updatedAt: '2019-07-18T12:38:38.322Z',
    },
  });

const createValidChunk = nock('http://metadata.openintegrationhub.com/api/v1/domains/5d3031a20cbe7c00115c7d8f/schemas/address')
  .persist()
  .get('')
  .reply(200, {
    data: {
      id: '5d305efa0cbe7c00115c7d96',
      refs: [],
      name: 'Addresses',
      domainId: '5d3031a20cbe7c00115c7d8f',
      description: 'Person Model',
      uri: '/api/v1/domains/5d3031a20cbe7c00115c7d8f/schemas/address',
      value: {
        $id: 'http://metadata.openintegrationhub.com/api/v1/domains/5d3031a20cbe7c00115c7d8f/schemas/address',
        firstName: 'string',
        lastName: 'string',
        email: 'string',
        birthday: 'string',
        required: [
          'lastName',
          'email',
          'birthday',
        ],
      },
      owners: [
        {
          id: '5d2da57e80304e0011388bfe',
          type: 'USER',
        },
        {},
      ],
      createdAt: '2019-07-18T11:58:50.747Z',
      updatedAt: '2019-07-18T12:38:38.322Z',
    },
  });

module.exports = {
  chunk1,
  chunk2,
  chunk3,
  chunk4,
  chunk5,
  chunk6,
  chunk7,
  chunk8,
  chunk9,
  chunk10,
  chunk11,
  chunk12,
  chunk13,
  chunk14,
  chunk15,
  createInvalidChunk,
  createValidChunk,
};
