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
  {
    name: 'notEquals',
    code: (data, permission) => {},
  },
  {
    name: 'smallerThen',
    code: (data, permission) => {},
  },
  {
    name: 'biggerThen',
    code: (data, permission) => {},
  },
  {
    name: 'smallerOrEqual',
    code: (data, permission) => {},
  },
  {
    name: 'biggerOrEqual',
    code: (data, permission) => {},
  },
  {
    name: 'contains',
    code: (data, permission) => {},
  },
  {
    name: 'notContains',
    code: (data, permission) => {},
  },

  {
    name: 'exists',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'exists') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            passes = true;
          }
        }
      }

      return {
        passes,
        data: returnData,
      };
    },
  },

  {
    name: 'notExists',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'notExists') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (!result.found) {
            passes = true;
          }
        }
      }

      return {
        passes,
        data: returnData,
      };
    },
  },

  {
    name: 'keyExists',
    code: (data, permission) => {},
  },

  {
    name: 'hasLength',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'hasLength') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (result.value && result.value.length === permission.constraint.rightOperand) passes = true
          }
        }
      }

      return {
        passes,
        data: returnData,
      };
    },
  },

  {
    name: 'keyLength',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'keyLength') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (result.value && typeof result.value === 'object') {
              const keys = Object.keys(result.value);
              if (keys && keys.length === permission.constraint.rightOperand) passes = true;
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

  {
    name: 'isType',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'isType') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (result.value && typeof result.value === permission.constraint.rightOperand) passes = true
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
