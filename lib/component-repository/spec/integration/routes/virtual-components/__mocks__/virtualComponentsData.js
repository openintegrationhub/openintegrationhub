const faker = require('faker');
const mongoose = require('mongoose');
const { permitToken: { value: userWithComponents } } = require('./tokens');
const { ObjectId } = mongoose.Types;

const virtualComponent1Id = new ObjectId();
const component1Id = new ObjectId();
const componentNotDefaultId = new ObjectId();
const componentVersion1Id = new ObjectId();
const componentVersionNotDefaultId = new ObjectId();

const virtualComponent2Id = new ObjectId();
const component2Id = new ObjectId();
const componentVersion2Id = new ObjectId();

const virtualComponent3Id = new ObjectId();
const component3Id = new ObjectId();
const componentVersion3Id = new ObjectId();

const virtualComponent4Id = new ObjectId();
const component4Id = new ObjectId();
const componentVersion4Id = new ObjectId();

const componentConfig1Id = new ObjectId();
const componentConfig2Id = new ObjectId();
const componentConfig3Id = new ObjectId();
const componentIdNoConfig = new ObjectId();
const virtualComponentIdNoConfig = new ObjectId();
const componentVersiontIdNoConfig = new ObjectId();

/* Public virtual component */
const virtualComponent1 = {
  _id: virtualComponent1Id,
  name: faker.name.firstName(),
  access: 'public',
  defaultVersionId: componentVersion1Id,
  versions: [
    { id: componentVersion1Id, version: '1.0.0' },
    { id: componentVersionNotDefaultId, version: '1.0.1' },
  ],
};
const virtualComponentNoConfig = {
  _id: virtualComponentIdNoConfig,
  name: faker.name.firstName(),
  access: 'public',
  defaultVersionId: componentVersiontIdNoConfig,
  versions: [
    { id: componentVersiontIdNoConfig, version: '1.0.0' },
  ],
};

const component1 = {
  _id: component1Id,
  name: faker.name.firstName(),
  isGlobal: true,
  active: true,
  description: faker.name.jobDescriptor(),
  logo: faker.internet.url(),
  distribution: {
    image: faker.name.firstName()
  }
};
const componentΝοConfig = {
  _id: componentIdNoConfig,
  name: faker.name.firstName(),
  isGlobal: true,
  active: true,
  description: faker.name.jobDescriptor(),
  logo: faker.internet.url(),
  distribution: {
    image: faker.name.firstName()
  }
};
const componentNotDefault = {
  _id: componentNotDefaultId,
  name: faker.name.firstName(),
  isGlobal: true,
  active: true,
  description: faker.name.jobDescriptor(),
  logo: faker.internet.url(),
  distribution: {
    image: faker.name.firstName()
  }
};
const componentVersion1 = {
  _id: componentVersion1Id,
  name: faker.name.firstName(),
  virtualComponentId: virtualComponent1Id,
  componentId: component1Id,
  authorization: {
    authType: 'API_KEY',
  },
  actions: [],
  triggers: [],
};
const componentVersionNoConfig = {
  _id: componentVersiontIdNoConfig,
  name: faker.name.firstName(),
  virtualComponentId: virtualComponentIdNoConfig,
  componentId: componentIdNoConfig,
  authorization: {
    authType: 'API_KEY',
  },
  actions: [],
  triggers: [],
};
const componentVersionNotDefaultVersion = {
  _id: componentVersionNotDefaultId,
  name: faker.name.firstName(),
  virtualComponentId: virtualComponent1Id,
  componentId: componentNotDefaultId,
  authorization: {
    authType: 'API_KEY',
  },
  actions: [],
  triggers: [],
};
/* END Public virtual component */

/* Private virtual component that owns to the mock userWithComponent */
const virtualComponent2 = {
  _id: virtualComponent2Id,
  name: faker.name.firstName(),
  access: 'private',
  defaultVersionId: componentVersion2Id,
  versions: [{ id: componentVersion2Id, version: '1.0.0' }],
  tenant: userWithComponents.tenant,
  owners: [{ type: 'user', id: userWithComponents.sub }],
};

const component2 = {
  _id: component2Id,
  name: faker.name.firstName(),
  isGlobal: true,
  active: true,
  description: faker.name.jobDescriptor(),
  logo: faker.internet.url(),
  tenant: userWithComponents.tenant,
  owners: [{ type: 'user', id: userWithComponents.sub }],
  distribution: {
    image: faker.name.firstName()
  }
};
const componentVersion2 = {
  _id: componentVersion2Id,
  name: faker.name.firstName(),
  virtualComponentId: virtualComponent2Id,
  componentId: component2Id,
  authorization: {
    authType: 'API_KEY',
  },
  actions: [
    {
      name: "name1",
      title: "title1",
      description:"description1" ,
      function: "getName"
    },
    {
      name: "name2",
      title: "title2",
      description:"description2" ,
      function: "getName2"
    }
  ],
  triggers: [
    {
      name: "name3",
      title: "title1",
      description:"description1" ,
      function: "getOrgs"
    },
    {
      name: "name4",
      title: "title2",
      description:"description2" ,
      function: "getOrgs2"
    }
  ],
};
/* END Private virtual component that owns to the mock userWithComponent */

/* Private virtual component that owns to the mock userWithComponent */
const virtualComponent3 = {
  _id: virtualComponent3Id,
  name: faker.name.firstName(),
  access: 'private',
  defaultVersionId: componentVersion3Id,
  versions: [{ id: componentVersion3Id, version: '1.0.0' }],
};
const componentConfig1 = {
  _id: componentConfig1Id,
  componentVersionId: componentVersion1Id ,
  authClientId: "71efeb5220a6cb9b4c076eae",
  tenant: userWithComponents.tenant,
};
const componentConfig2 = {
  _id: componentConfig2Id,
  componentVersionId: componentVersion2Id,
  authClientId: "71efeb5220a6cb9b4c076eae",
  tenant: userWithComponents.tenant,
};
const componentConfig3 = {
  _id: componentConfig3Id,
  componentVersionId: componentVersion3Id,
  authClientId: "71efeb5220a6cb9b4c076eae",
  tenant: "71efeb5220a6cb9b4c089eae",
};

const component3 = {
  _id: component3Id,
  name: faker.name.firstName(),
  isGlobal: true,
  active: true,
  description: faker.name.jobDescriptor(),
  logo: faker.internet.url(),
  distribution: {
    image: faker.name.firstName()
  }
};
const componentVersion3 = {
  _id: componentVersion3Id,
  name: faker.name.firstName(),
  virtualComponentId: virtualComponent3Id,
  componentId: component3Id,
  authorization: {
    authType: 'API_KEY',
  },
  actions: [
    {
    name: "name1",
    title: "title1",
    description:"description1" ,
    function: "getName"
    },
    {
      name: "name2",
      title: "title2",
      description:"description2" ,
      function: "getName2"
    }
  ],
  triggers: [
    {
      name: "name1",
      title: "title1",
      description:"description1" ,
      function: "getOrgs"
    },
    {
        name: "name2",
        title: "title2",
        description:"description2" ,
        function: "getOrgs2"
    }
  ],
};
/* END Private virtual component that owns to the mock userWithComponent */

/* Inactive component */
const inactiveVirtualComponent = {
  _id: virtualComponent4Id,
  name: faker.name.firstName(),
  active: false,
  access: 'public',
  defaultVersionId: componentVersion4Id,
  versions: [{ id: componentVersion4Id, version: '1.0.0' }],
};
const inactiveComponent = {
  _id: component4Id,
  name: faker.name.firstName(),
  isGlobal: true,
  active: true,
  description: faker.name.jobDescriptor(),
  logo: faker.internet.url(),
  distribution: {
    image: faker.name.firstName()
  }
};
const inactiveComponentVersion = {
  _id: componentVersion4Id,
  name: faker.name.firstName(),
  virtualComponentId: virtualComponent4Id,
  componentId: component4Id,
  authorization: {
    authType: 'API_KEY',
  },
  actions: [],
  triggers: [],
};
/* END Inactive component */

module.exports = {
  virtualComponent1,
  component1,
  componentNotDefault,
  componentVersion1,
  componentVersionNotDefaultVersion,
  virtualComponent2,
  component2,
  componentVersion2,
  virtualComponent3,
  component3,
  componentVersion3,
  inactiveVirtualComponent,
  inactiveComponent,
  inactiveComponentVersion,
  componentConfig1,
  componentConfig2,
  componentConfig3,
  virtualComponent2,
  componentVersion2,
  virtualComponentNoConfig,
  componentVersionNoConfig,
  componentΝοConfig
};
