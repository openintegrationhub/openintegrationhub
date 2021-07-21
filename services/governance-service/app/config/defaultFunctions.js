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
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'notEquals') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = true;
              for (let i = 0; i < result.value.length; i += 1) {
                if (result.value[i] === permission.constraint.rightOperand) {
                  passes = false;
                  break;
                }
              }
            } else if (result.value === permission.constraint.rightOperand) {
              passes = false;
            } else {
              passes = true;
            }
          } else {
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
    name: 'smallerThen',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'smallerThen') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = true;
              for (let i = 0; i < result.value.length; i += 1) {
                if (parseFloat(result.value[i]) >= permission.constraint.rightOperand) {
                  passes = false;
                  break;
                }
              }
            } else if (parseFloat(result.value) < permission.constraint.rightOperand) {
              passes = true;
            }
          } else {
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
    name: 'biggerThen',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'biggerThen') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = true;
              for (let i = 0; i < result.value.length; i += 1) {
                if (parseFloat(result.value[i]) <= permission.constraint.rightOperand) {
                  passes = false;
                  break;
                }
              }
            } else if (parseFloat(result.value) > permission.constraint.rightOperand) {
              passes = true;
            }
          } else {
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
    name: 'smallerOrEqual',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'smallerOrEqual') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = true;
              for (let i = 0; i < result.value.length; i += 1) {
                if (parseFloat(result.value[i]) > permission.constraint.rightOperand) {
                  passes = false;
                  break;
                }
              }
            } else if (parseFloat(result.value) <= permission.constraint.rightOperand) {
              passes = true;
            }
          } else {
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
    name: 'biggerOrEqual',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'biggerOrEqual') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = true;
              for (let i = 0; i < result.value.length; i += 1) {
                if (parseFloat(result.value[i]) < permission.constraint.rightOperand) {
                  passes = false;
                  break;
                }
              }
            } else if (parseFloat(result.value) >= permission.constraint.rightOperand) {
              passes = true;
            }
          } else {
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
    name: 'contains',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'contains') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);

          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = false;
              for (let i = 0; i < result.value.length; i += 1) {
                if (
                  result.value[i]
                  && typeof result.value[i] === 'string'
                  && result.value[i].indexOf(permission.constraint.rightOperand) > -1
                ) {
                  passes = true;
                  break;
                }
              }
            } else if (
              result.value
              && typeof result.value === 'string'
              && result.value.indexOf(permission.constraint.rightOperand) > -1
            ) {
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
    name: 'notContains',
    code: (data, permission) => {
      let passes = false;
      const returnData = Object.assign({}, data);

      if (permission.constraint && permission.constraint.operator) {
        if (permission.constraint.operator === 'notContains') {
          const result = getValuesFromData(returnData, permission.constraint.leftOperand);
          if (result.found) {
            if (Array.isArray(result.value)) {
              passes = true;
              for (let i = 0; i < result.value.length; i += 1) {
                if (
                  result.value[i]
                  && typeof result.value[i] === 'string'
                  && result.value[i].indexOf(permission.constraint.rightOperand) > -1
                ) {
                  passes = false;
                  break;
                }
              }
            } else if (
              !result.value
              || typeof result.value !== 'string'
              || result.value.indexOf(permission.constraint.rightOperand) === -1
            ) {
              passes = true;
            }
          } else {
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
];


module.exports = defaultFunctions;
