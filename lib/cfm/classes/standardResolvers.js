const Resolver = require('./Resolver');

class ResolverCopyNew extends Resolver {
  applyResolution(valueA, valueB) {
    if (valueA === null) return {
      value: valueB
    };
    return {
      value: valueA
    };
  }
}

class ResolverRejectEmpty extends Resolver {
  applyResolution(valueA, valueB) {
    if (!valueA) return {
      value: valueB
    };
    return {
      value: valueA
    };
  }
}

class ResolverIfUpdate extends Resolver {
  applyResolution(valueA, valueB) {
    if (!valueB) return false;
    if (!valueA) return {
      value: valueB
    };
    return {
      value: valueA
    };
  }
}

class ResolverIfUpdateObject extends Resolver {
  applyResolution(valueA, valueB) {
    if (typeof valueA !== 'object') return {
      value: valueB
    };
    if (typeof valueB !== 'object') return false;
    const keys = Object.keys(valueA);
    if (keys.length === 0) return {
      value: valueB
    };
    let empty = 0;
    for (key in keys) {
      if (!(key in valueB)) return false;
      if (!valueA[key]) empty += 1;
    }
    if (empty < keys.length) return {
      value: valueA
    };
    return {
      value: valueB
    };
  }
}

class ResolverOnlyOverwriteEmpty extends Resolver {
  applyResolution(valueA, valueB) {
    if (valueB === null || valueB === '') return {
      value: valueA
    };
    return {
      value: valueB
    };
  }
}

// This resolver compares to objects and returns null if they are equal
class ResolverSkipDuplicateEntry extends Resolver {
  constructor() {
    super();
    this.equalObjects = function(objA, objB) {
      if (typeof objA !== 'object') return (objA === objB);

      let attribute;
      for (attribute in objA) {
        if ((attribute in objA) !== (attribute in objB)) return false;

        const type = typeof(objA[attribute]);

        if (type === 'object') {
          if (Array.isArray(objA[attribute])) {
            // We assume the same order
            const length = objA[attribute].length;
            for (let i = 0; i < length; i += 1) {
              if (!this.equalObjects(objA[attribute][i], objB[attribute][i])) return false;
            }
          } else if (!this.equalObjects(objA[attribute], objB[attribute])) return false;
        } else if (objA[attribute] !== objB[attribute]) return false;
      }

      for (attribute in objB) {
        if (!(attribute in objA)) return false;
        if (!this.equalObjects(objA[attribute], objB[attribute])) return false;
      }
      return true;
    };
  }

  applyResolution(valueA, valueB) {
    const result = this.equalObjects(valueA, valueB);
    if (result === true) return {};
    return false;
  }
}

// This resolver add all entries from array A to array B if they do not exist in B
class ResolverUniqEntriesInArray extends Resolver {
  applyResolution(valueA, valueB) {
    const allEntries = valueB;
    let a;
    for (a in valueA) {
      // loop through array in A
      let b;
      let hasMatch = false;
      for (b in valueB) {
        // loop through array in B

        let keys = 0;
        let matches = 0;
        let key;
        for (key in valueB[b]) {
          keys += 1;
          if (key in valueA[a]) {
            if (valueA[a][key] === valueB[b][key]) {
              matches += 1;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        if (keys === matches) {
          hasMatch = true;
          break;
        }
      }

      if (hasMatch === false) {
        allEntries.push(valueA[a]);
      }
    }

    return {
      value: allEntries
    };
  }
}

module.exports = {
  ResolverCopyNew,
  ResolverRejectEmpty,
  ResolverIfUpdate,
  ResolverIfUpdateObject,
  ResolverOnlyOverwriteEmpty,
  ResolverUniqEntriesInArray,
  ResolverSkipDuplicateEntry,
};
