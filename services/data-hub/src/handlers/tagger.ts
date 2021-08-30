const { Notation } = require('notation');
const { comparators } = require('./comparators');

export default function tagObject(object, fields) {
  const notate = Notation.create;
  if(!object || !object.content) {
    console.debug('Content or dataObject not set', object);
    return object;
  }

  const { content } = object;

  let tags = object.enrichmentResults.tags || [];

  for (let i = 0; i < fields.length; i += 1) {
    if (!fields[i].additive) {
      tags = [];
    }

    const comparator = comparators[fields[i].comparator];
    if (!comparator) {
      console.error('Comparator ' + fields[i].comparator + ' not found.');
      continue;
    }

    const result = comparator(content, fields[i].arguments);
    if (result === true) tags.push(fields[i].tag);
  }

  const returnObject = Object.assign({}, object);
  if (!returnObject.enrichmentResults) returnObject.enrichmentResults = {};
  returnObject.enrichmentResults.tags = tags;

  return returnObject;
}
