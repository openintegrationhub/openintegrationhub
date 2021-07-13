const { Notation } = require('notation');

function scoreObject(object, fields) {
  const notate = Notation.create;
  const { content } = object;
  let score = 0;
  let totalWeigths = 0;

  for (let i = 0; i < fields.length; i += 1) {
    const value = notate(content).get(fields[i].key);
    if (value) {
      let passes = true;

      if (fields[i].minLength && value.length <= fields[i].minLength) passes = false;
      if (fields[i].maxLength && value.length >= fields[i].maxLength) passes = false;

      if (passes) score += fields[i].weight || 1;
    }

    totalWeights += fields[i].weight || 1;
  }

  const returnObject = Object.assign({}, object);

  if (!returnObject.meta) returnObject.meta = {};

  returnObject.meta.score = score;
  returnObject.meta.normalizedScore = score/totalWeights;

  return returnObject

}

module.exports = { scoreObject }
