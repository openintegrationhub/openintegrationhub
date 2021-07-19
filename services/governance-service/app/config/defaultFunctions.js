const dotprop = require('dot-prop');


function getValuesFromData(data, selector) {
  const keys = selector.trim().split('.');

  let currentData = data;
  let found = false;

  // For all keys in selector
  for (let i = 0; i < keys.length; i += 1) {
    if (Array.isArray(currentData)) {
      const results = [];
      for (let j = 0; j < currentData.length; j += 1) {
        if (typeof currentData[j] === 'object') {
          if (keys[i] in currentData[j]) {
            results.push(currentData[j][keys[i]]);
            if (i + 1 === keys.length) found = true;
          }
        }
      }
      currentData = results;
    } else if (typeof currentData === 'object') {
      if (keys[i] in currentData) {
        currentData = currentData[keys[i]];
        if (i + 1 === keys.length) found = true;
      }
    }
  }

  return {
    found,
    value: currentData,
  };
}


const defaultFunctions = [
  {
    id: false,
    name: 'DefaultFunction1',
    code: 'x * y',
  },

  {
    name: 'anonymize',
    code: (data, duty) => {
      console.log(data, duty);
      const returnData = Object.assign({}, data);

      // TODO: Genericise constraint operator handling
      if (duty.constraint && duty.constraint.operator) {
        if (duty.constraint.operator === 'applyToKey') {
          const key = duty.constraint.leftOperand;
          if (dotprop.has(returnData, key)) dotprop.set(returnData, key, 'XXXXXXXXXX');
        }
      }

      return {
        passes: true,
        data: returnData,
      };
    },
  },

  {
    name: 'equals',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'equals') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              for (let i = 0; i < result.value.length; i += 1) {
                if (result.value[i] === permission.constraint.rightOperand) {
                  passes = true;
                  break;
                }
              }
            } else if (result.value === permission.constraint.rightOperand) {
              passes = true;
            }
          }
        }
      }

      return {
        passes,
        data: returnData,
      };
    },
  },
];


module.exports = defaultFunctions;
