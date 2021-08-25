const { Notation } = require('notation');
const { comparators } = require('./comparators.ts');

export default function tagObject(object, fields) {
  const notate = Notation.create;
  if(!object || !object.content) {
    console.debug('Content or dataObject not set', object);
    return object;
  }

  const { content } = object;

  const tags = [];

  for (let i = 0; i < fields.length; i += 1) {
    const comparator = comparators[fields[i].comparator];
    if (!comparator) {
      console.error('Comparator ' + fields[i].comparator + ' not found.');
      continue;
    }

    const result = comparator(content, fields[i].arguments);
    if (result === true) tags.push(fields[i].tag);
  }

  const returnObject = Object.assign({}, object);
  if (!returnObject.enrichtmentResults) returnObject.enrichtmentResults = {};
  returnObject.enrichtmentResults.tags = tags;

  return returnObject;
}
