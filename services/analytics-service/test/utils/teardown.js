/* eslint no-underscore-dangle: "off" */
/* eslint func-names: "off" */

module.exports = async function () {
  console.log('Teardown mongod');
  await global.__MONGOD__.stop();
  console.log('Teardown successful');
};
