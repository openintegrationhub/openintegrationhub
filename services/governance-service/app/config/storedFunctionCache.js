const { fork } = require('child_process');

const fs = require('fs');

const log = require('./logger'); // eslint-disable-line

const config = require('./index');

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

const args = [];

const processConfig = {
  detached: true,
  // uid: 1234,
  // gid: 1002,
  // cwd: appDir,
};

const functionsDir = `${__dirname}/functionsCache/`;

const template = `
const executor = function (a, b) {
 <<<code>>>
};

process.on('message', message => {
 console.log('Received msg in executor:', message);

 try {
  const result = executor(message);
  process.send(result);
 } catch (e) {
  console.log('Error:', e);
 }

});
`;

class StoredFunctionCache {
  constructor() {
    this.storedFunctions = {};
    this.processes = {};
  }

  async execute(id, name, oihUser, data, rules) {
    return new Promise((resolve, reject) => {
      // Abort long running functions
      const timeout = setTimeout(reject, 10000);

      let processExists = false;
      if (id in this.processes) {
        try {
          // Send message
          this.processes[id].code.send({ data, rules });
          processExists = true;
          this.processes[id].lastUsed = Date.now();
        } catch (e) {
          console.log(e);
        }
      }

      if (!processExists) {
        // Setup process
        this.processes[id] = {
          code: fork(`${functionsDir}${id}.js`, args, processConfig),
          name,
          lastUsed: Date.now(),
        };

        this.processes[id].on('message', (message) => {
          // Response from process
          // @todo:
          clearTimeout(timeout);
          resolve(message);
        });

        // Send message
        try {
          this.processes[id].code.send({ data, rules });
        } catch (e) {
          console.log(e);
        }
      }
    });
  }

  clearUnused(timestamp) {
    const current = (timestamp) || Date.now();

    // eslint-disable-next-line
    for (const key in this.processes) {
      try {
        if (this.processes[key].lastUsed + 100000 < current) {
          try {
            this.processes[key].code.kill();
          } catch (e) {
            console.log(e);
          }
          const name = this.processes[key].name;
          delete this.processes[key];
          this.delete(key, name);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  clearAll() {
    // eslint-disable-next-line
    for (const key in this.processes) {
      try {
        this.processes[key].code.kill();
      } catch (e) {
        console.log(e);
      }
      const name = this.processes[key].name;
      delete this.processes[key];
      this.delete(key, name);
    }
    this.storedFunctions = {};
  }

  async loadAll() {
    const response = await storage.getAllStoredFunctions();

    if (response.length > 0) {
      for (let i = 0; i < response.length; i += 1) {
        this.storedFunctions[response[i].name] = [{
          id: response[i].id,
          oihUser: response[i].metaData.oihUser,
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

  upsert(id, name, oihUser, code) {
    try {
      const fullCode = template.replace('<<<code>>>', code);
      fs.writeFileSync(`${functionsDir}${id}.js`, fullCode);
    } catch (e) {
      console.log(e);
    }

    if (name in this.storedFunctions) {
      let found = false;
      for (let i = 0; i < this.storedFunctions[name].length; i += 1) {
        if (this.storedFunctions[name][i].oihUser === oihUser) {
          found = true;
          this.storedFunctions[name][i] = {
            id,
            oihUser,
          };
        }
      }
      if (!found) {
        this.storedFunctions[name].push({
          id,
          oihUser,
        });
      }
    } else {
      this.storedFunctions[name] = [{
        id,
        oihUser,
      }];
    }
  }

  delete(id, name) {
    try {
      fs.unlinkSync(`${functionsDir}${id}.js`);
    } catch (e) {
      console.log(e);
    }

    if (!this.storedFunctions || !(name in this.storedFunctions)) return false;

    for (let i = 0; i < this.storedFunctions[name].length; i += 1) {
      if (this.storedFunctions[name][i].id === id) {
        try {
          if (id in this.processes) this.processes[id].code.kill();
        } catch (e) {
          console.log(e);
        }
        delete this.processes[id];
        delete this.storedFunctions[name][i];
        this.storedFunctions[name].splice(i, 1);
        i -= 1;
      }
    }
    if (this.storedFunctions[name].length === 0) delete this.storedFunctions[name];
    return true;
  }
}

const storedFunctionCache = new StoredFunctionCache();

// Ensure unused processes end
if (!process.env.NODE_ENV === 'test') setInterval(storedFunctionCache.clearUnused, 100000);

module.exports = storedFunctionCache;
