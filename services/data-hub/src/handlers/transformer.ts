const jsonata = require('jsonata');

export default function transformObject(object, fields) {

  if(!object || !object.content) {
    console.debug('Content or dataObject not set', object);
    return object;
  }

  let content = Object.assign({}, object.content);

  for (let i = 0; i < fields.length; i += 1) {
    try {
      const expression = jsonata(fields[i].expression);
      const result = expression.evaluate(content);
      if (result) content = result;
    } catch (e) {
      console.error('Error evaluating expression!');
      console.error(e);
    }
  }

  const returnObject = Object.assign({}, object);
  returnObject.content = content;

  return returnObject;
}
