const { Notation } = require('notation');

const comparators = {
  hasField: function(content, { field }) {
    const notate = Notation.create;
    const value = notate(content).get(field);
    if (value) return true;
    return false;
  },
  fieldEquals: function(content, { field, targetValue }) {
    const notate = Notation.create;
    const value = notate(content).get(field);
    if (targetValue === value) return true;
    return false;
  }
}

export { comparators };
