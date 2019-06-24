const chunk1 = {
  ilaId: '123asd',
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  cid: 'lastName',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  cid: 'firstName',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
    lastName: 'Hobbs',
    firstName: 'jack',
    email: 'hobbs@mail.com',
  },
};

const chunk6 = {
  ilaId: '987asd',
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
    lastName: 'Hobbs',
    firstName: 'Jack',
    email: 'hobbs@mail.com',
  },
};

const chunk7 = {
  ilaId: '567qwe',
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  cid: 'lastName',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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

const chunk10 = {
  ilaId: '123asd',
  cid: 'lastName',
  def: {
    domainId: 'addresses',
  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

const chunk11 = {
  ilaId: '123asd',
  cid: 'lastName',
  def: {
    domainId: 'addresses',
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
  cid: 'lastName',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com',
    schema: 213456,
  },
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    salutation: 'Mr.',
  },
};

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
};
