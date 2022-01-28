const VirtualComponent = require('../../../../../src/models/VirtualComponent');
const Component = require('../../../../../src/models/Component');
const ComponentVersion = require('../../../../../src/models/ComponentVersion');

const {
  component1,
  component2,
  component3,
  inactiveComponent,
  componentNotDefault,
  virtualComponent1,
  virtualComponent2,
  virtualComponent3,
  inactiveVirtualComponent,
  componentVersion1,
  componentVersion2,
  componentVersion3,
  inactiveComponentVersion,
  componentVersionNotDefaultVersion
} = require('./virtualComponentsData');

const insertDatainDb = async () => {
    await VirtualComponent.insertMany([virtualComponent1, virtualComponent2, virtualComponent3, inactiveVirtualComponent]);
    await Component.insertMany([component1, component2, component3, componentNotDefault, inactiveComponent]);
    await ComponentVersion.insertMany([componentVersion1, componentVersion2, componentVersion3, inactiveComponentVersion, componentVersionNotDefaultVersion]);
};

const deleteAllData = async() => {
    await VirtualComponent.deleteMany({});
    await Component.deleteMany({});
    await ComponentVersion.deleteMany({});
}

module.exports = {
  insertDatainDb,
  deleteAllData
};
