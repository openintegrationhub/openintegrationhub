const VirtualComponent = require('../../../../../src/models/VirtualComponent');
const Component = require('../../../../../src/models/Component');
const ComponentVersion = require('../../../../../src/models/ComponentVersion');
const ComponentConfig = require('../../../../../src/models/ComponentConfig');

const {
  component1,
  component2,
  component3,
  inactiveComponent,
  component5,
  componentNotDefault,
  virtualComponent1,
  virtualComponent2,
  virtualComponent3,
  inactiveVirtualComponent,
  virtualComponent5,
  componentVersion1,
  componentVersion2,
  componentVersion3,
  inactiveComponentVersion,
  componentVersion5,
  componentVersionNotDefaultVersion,
  componentConfig1,
  componentConfig2,
  componentConfig3,
  componentΝοConfig,
  componentVersionNoConfig,
  virtualComponentNoConfig,
} = require('./virtualComponentsData');

const insertDatainDb = async () => {
  await VirtualComponent.insertMany([
    virtualComponent1,
    virtualComponent2,
    virtualComponent3,
    inactiveVirtualComponent,
    virtualComponentNoConfig,
    virtualComponent5,
  ]);
  await Component.insertMany([
    component1,
    component2,
    component3,
    componentNotDefault,
    inactiveComponent,
    componentΝοConfig,
    component5,
  ]);
  await ComponentVersion.insertMany([
    componentVersion1,
    componentVersion2,
    componentVersion3,
    inactiveComponentVersion,
    componentVersionNotDefaultVersion,
    componentVersionNoConfig,
    componentVersion5,
  ]);
  await ComponentConfig.insertMany([
    componentConfig1,
    componentConfig2,
    componentConfig3,
  ]);
};

const deleteAllData = async () => {
  await VirtualComponent.deleteMany({});
  await Component.deleteMany({});
  await ComponentVersion.deleteMany({});
  await ComponentConfig.deleteMany({});
};

module.exports = {
  insertDatainDb,
  deleteAllData,
};
