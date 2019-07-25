const Rule = require('./Rule');

const rejectEmpty = new Rule(['resolverRejectEmpty']);

const copyNew = new Rule(['resolverCopyNew']);

const mixedRule = new Rule(['resolverRejectEmpty', 'resolverIfUpdate']);

const onlyOverwriteEmpty = new Rule(['resolverOnlyOverwriteEmpty']);

const ifUpdate = new Rule(['resolverIfUpdate']);
const ifUpdateObject = new Rule(['resolverIfUpdateObject']);

const uniqArray = new Rule(['resolverUniqEntriesInArray']);

module.exports = {
  copyNew,
  rejectEmpty,
  mixedRule,
  onlyOverwriteEmpty,
  ifUpdate,
  ifUpdateObject,
  uniqArray,
};
