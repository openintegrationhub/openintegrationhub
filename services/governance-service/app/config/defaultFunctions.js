const dotprop = require('dot-prop');

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
];


module.exports = defaultFunctions;
