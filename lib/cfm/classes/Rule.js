// const log = require('../logger/logger'); // eslint-disable-line

class Rule {
  constructor(resolvers) {
    this.list = [];
    if (Array.isArray(resolvers)) {
      this.list = resolvers;
    } else {
      this.list = [resolvers];
    }
  }

  execute(valueA, valueB, resolvers) {
    let entry;
    for (entry in this.list) {
      // log.debug('Resolver selected by rule:', this.list[entry]);
      const result = resolvers[this.list[entry]].applyResolution(valueA, valueB);
      // if(result) return result;
      if (result !== false) {
        return result;
      }
    }
    return false;
  }
}

module.exports = Rule;