
const log = require('./logger'); // eslint-disable-line

const config = require('./index');

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

class StoredFunctionCache {
  constructor() {
    this.storedFunctions = {};
  }

  async loadAll() {
    const response = await storage.getStoredFunctions(
      { isAdmin: true },
      null, null, null, null,
      null, null, null, null,
      'id, name, code, metadata',
    );

    if (response.data.length > 0) {
      for (let i = 0; i < response.data.length; i += 1) {
        console.log(response.data[i].name, response.data[i].oihUser);
        this.storedFunctions[response.data[i].name] = [{
          code: response.data[i].code,
          oihUser: response.data[i].metaData.oihUser,
        }];
      }
    } else {
      log.debug('No stored functions found:', response);
    }
    return true;
  }

  setAll(obj) {
    this.storedFunctions = obj;
  }

  upsert(name, oihUser, code) {
    if (name in this.storedFunctions) {
      let found = false;
      for (let i = 0; i < this.storedFunctions[name].length; i += 1) {
        if (this.storedFunctions[name][i].oihUser === oihUser) {
          found = true;
          this.storedFunctions[name][i] = {
            code,
            oihUser,
          };
        }
      }
      if (!found) {
        this.storedFunctions[name].push({
          code,
          oihUser,
        });
      }
    } else {
      this.storedFunctions[name] = [{
        code,
        oihUser,
      }];
    }
  }

  delete(name, oihUser) {
    if (!this.storedFunctions || !(name in this.storedFunctions)) return false;

    for (let i = 0; i < this.storedFunctions[name].length; i += 1) {
      if (this.storedFunctions[name][i].oihUser === oihUser) {
        delete this.storedFunctions[name][i];
      }
    }
    return true;
  }
}

const storedFunctionCache = new StoredFunctionCache();

module.exports = storedFunctionCache;
