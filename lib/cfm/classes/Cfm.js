const merge = require('deepmerge');
// const log = require('../logger/logger'); // eslint-disable-line

const Resolver = require('./Resolver');
const Rule = require('./Rule');
const standardResolvers = require('./standardResolvers');
const standardRules = require('./standardRules');
const standardGlobalRules = require('./standardGlobalRules');

const defaultRuleSet = require('./defaultRuleSet');

class CFM {
  constructor() {
    this.resolvers = {};
    this.globalRules = {};
    this.hashGlobalRules = {};
    this.hashRules = {};
    this.hashKeyRule = {};
    this.hashDefaultRules = {};

    let resolver;
    for (resolver in standardResolvers) {
      this.resolvers[resolver] = new standardResolvers[resolver]();
    }

    this.hashRules = standardRules;
    this.hashGlobalRules = standardGlobalRules;

    this.setDefaultRules(defaultRuleSet.defaultRuleSet);
  }

  addCustomGlobalRule(name, globalResolver) {
    if (name in this.globalRules) return false;
    this.globalRules[name] = new Rule(globalResolver);
    return true;
  }

  addCustomRule(name, resolvers) {
    if (name in this.hashRules) return false;
    this.hashRules[name] = new Rule(resolvers);
    return true;
  }

  addCustomResolver(name, customFunction) {
    if (name in this.resolvers) return false;
    class newResolver extends Resolver {
      // applyResolution(incoming, target) = customFunction;
    }
    newResolver.applyResolution = customFunction;

    this.resolvers[name] = newResolver;
    return true;
  }

  setRules(rules) {
    let rule;
    for (rule in rules) {
      const length = rules[rule].length;
      for (let i = 0; i < length; i += 1) {
        this.hashKeyRule[rules[rule][i]] = rule;
      }
    }
  }

  setDefaultRules(rules) {
    if (Object.entries(rules).length > 0) {
      let rule;
      for (rule in rules) {
        this.hashDefaultRules[rules[rule]] = rule;
      }
    } else {
      this.hashDefaultRules = {};
    }
  }

  setGlobalRules(rules) {
    let rule;
    for (rule in rules) {
      this.globalRules[rules[rule]] = rule;
    }
  }

  eliminateDuplicateKeys(a) {
    const resultObject = a.reduce((result, current, i) => {
      result[current] = i;
      return result;
    }, {});
    return Object.keys(resultObject);
  }

  getAllKeys(obj) {
    const keys = [];
    let attribute;
    for (attribute in obj) {
      if (Array.isArray(obj[attribute])) {
        keys.push(`${attribute}.[]`);
        const length = obj[attribute].length;
        for (let i = 0; i < length; i += 1) {
          const subKeys = this.getAllKeys(obj[attribute][i]);
          let singleKey;
          for (singleKey in subKeys) {
            keys.push(`${attribute}.[].${subKeys[singleKey]}`);
          }
        }
      } else if (typeof obj[attribute] === 'object') {
        const subKeys = this.getAllKeys(obj[attribute]);
        let singleKey;
        for (singleKey in subKeys) {
          keys.push(`${attribute}.${singleKey}`);
        }
      } else {
        keys.push(attribute);
      }
    }
    return keys;
  }

  selectData(oldData, selector) {
    let data = oldData;
    const elements = selector.split('.');

    const length = elements.length;
    for (let i = 0; i < length; i += 1) {
      if (elements[i] === '[]') {
        break;
      } else {
        data = (elements[i] in data) ? data[elements[i]] : null;
      }
      if (data === null) break;
    }

    return data;
  }

  createDataBySelector(selector, value) {
    const jsonString = '';

    const elements = selector.split('.').reverse();

    let current = value;
    const length = elements.length;
    for (let i = 0; i < length; i += 1) {
      if (elements[i] === '[]') {
        if (!Array.isArray(current)) current = [current];
      } else {
        const newObject = {};
        newObject[elements[i]] = current;
        current = newObject;
      }
    }

    return current;
  }

  resolve(incoming, target) {

    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return {
        error: 'Incoming is not an object'
      };
    }

    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      return {
        error: 'Target is not an object'
      };
    }

    let resolution = {};
    let keys = [];

    keys = this.getAllKeys(incoming);
    keys = keys.concat(this.getAllKeys(target));
    keys = this.eliminateDuplicateKeys(keys);

    let currentGlobalRule;
    for (currentGlobalRule in this.globalRules) {
      const result = this.hashGlobalRules[this.globalRules[currentGlobalRule]].execute(incoming, target, this.resolvers);

      if (typeof result === 'object' && Object.entries(result).length === 0) return {};
      if (result !== false) return result.value;
    }

    let i;
    for (i in keys) {
      if (keys[i] in this.hashKeyRule) {
        const currentRule = this.hashKeyRule[keys[i]];

        // Select affected data
        const dataA = this.selectData(incoming, keys[i]);
        const dataB = this.selectData(target, keys[i]);

        // Exact rule match found --> execute rule
        const value = this.hashRules[currentRule].execute(dataA, dataB, this.resolvers);

        if (value !== false) {
          // set affected data in resolution ...
          const creation = this.createDataBySelector(keys[i], value.value);

          Object.assign(resolution, creation);
        }
      } else {
        let hasRule = false;
        const elements = keys[i].split('.');
        const length = elements.length - 1;
        for (let i = 0; i < length; i += 1) {
          elements.pop();
          const subKey = elements.join('.');
          if (subKey in this.hashKeyRule) {
            hasRule = true;
            break;
          }
        }

        if (hasRule === false) {
          // Select affected data
          const dataA = this.selectData(incoming, keys[i]);
          const dataB = this.selectData(target, keys[i]);

          let currentDefaultRule;
          for (currentDefaultRule in this.hashDefaultRules) {
            const value = this.hashRules[this.hashDefaultRules[currentDefaultRule]].execute(dataA, dataB, this.resolvers);
            if (value !== false) {
              const creation = this.createDataBySelector(keys[i], value.value);
              resolution = merge(resolution, creation);
            }
          }
        }
      }
    }
    return resolution;
  }
}

module.exports = CFM;