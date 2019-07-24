const chunk1 = {
  ilaId: '123asd',
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    name: 'Company Ltd.',
    logo: 'https://company.com/logo.png',
  },
  splitSchema: [
    {
      meta: {
        splitKey: '001',
        userId: '12345678',
      },
      payload: {
        firstName: 'string',
        lastName: 'string',
        email: 'string',
      },
    },
    {
      meta: {
        splitKey: '002',
        userId: '12345678',
      },
      payload: {
        name: 'string',
        logo: 'string',
      },
    },
  ],
};

const chunk2 = {
  ilaId: '123asd',
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    name: 'Company Ltd.',
    logo: 'https://company.com/logo.png',
  },
};

const chunk3 = {
  ilaId: '123asd',
  payload: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'doe@mail.com',
    name: 'Company Ltd.',
    logo: 'https://company.com/logo.png',
  },
  splitSchema: [],
};

const chunk4 = {
  ilaId: '123asd',
  payload: {
    firstName: 'Mark',
    lastName: 'Smith',
    email: 'smith@mail.com',
    name: 'Company Ltd.',
    logo: 'https://company.com/logo.png',
  },
  splitSchema: [
    {
      meta: {
        splitKey: '001',
        userId: '12345678',
      },
      payload: {
        firstName: 'string',
        lastName: 'string',
        email: 'string',
        age: 'number',
      },
    },
    {
      meta: {
        splitKey: '002',
        userId: '12345678',
      },
      payload: {
        name: 'string',
        logo: 'string',
        website: 'string',
      },
    },
  ],
};

module.exports = {
  chunk1, chunk2, chunk3, chunk4,
};
