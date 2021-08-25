const { Notation } = require('notation');

export default function scoreObject(object, fields) {
  const notate = Notation.create;
  if(!object || !object.content) {
    console.debug('Content or dataObject not set', object);
    return object;
  }

  const { content } = object;
  let score = 0;
  let totalWeights = 0;

  for (let i = 0; i < fields.length; i += 1) {
    const value = notate(content).get(fields[i].key);
    if (value) {
      let passes = true;

      if (fields[i].minLength && value.length < fields[i].minLength) passes = false;
      if (fields[i].maxLength && value.length > fields[i].maxLength) passes = false;

      if (passes) score += fields[i].weight || 1;
    }

    totalWeights += fields[i].weight || 1;
  }

  const returnObject = Object.assign({}, object);

  if (!returnObject.enrichtmentResults) returnObject.enrichtmentResults = {};

  returnObject.enrichtmentResults.score = score;
  returnObject.enrichtmentResults.normalizedScore = score/totalWeights;

  return returnObject

}
