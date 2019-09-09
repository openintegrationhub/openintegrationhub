const Rule = require('./Rule');

const rejectEmpty = new Rule(['ResolverRejectEmpty']);

const copyNew = new Rule(['ResolverCopyNew']);

const mixedRule = new Rule(['ResolverRejectEmpty', 'ResolverIfUpdate']);

const onlyOverwriteEmpty = new Rule(['ResolverOnlyOverwriteEmpty']);

const ifUpdate = new Rule(['ResolverIfUpdate']);

const ifUpdateObject = new Rule(['ResolverIfUpdateObject']);

const uniqArray = new Rule(['ResolverUniqEntriesInArray']);

module.exports = {
  copyNew,
  rejectEmpty,
  mixedRule,
  onlyOverwriteEmpty,
  ifUpdate,
  ifUpdateObject,
  uniqArray,
};