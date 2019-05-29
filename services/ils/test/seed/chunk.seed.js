const chunk1 = {
  ilaId: '123asd',
  cid: 'email',
  def: {
    domainId: 'addresses',
    uri: 'http://metadata.openintegrationhub.com/domains/addresses/schema/uri',
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
  def: {},
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
  def: {},
  payload: {
    lastName: 'Smith',
    email: 'smith@mail.com',
  },
};

const chunk5 = {
  ilaId: '',
  cid: 'email',
  def: {},
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
  },
  payload: {
    lastName: 'Peterson',
    email: 'peterson@mail.com',
  },
};

module.exports = {
  chunk1, chunk2, chunk3, chunk4, chunk5, chunk6, chunk7, chunk8,
};
