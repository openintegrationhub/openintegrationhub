function checkInteroperability(component) {

const result = {
  get: false,
  post: false,
  put: false,
  upsert: false,
  delete: false,
  error: false
}

const getAliases = ['get', 'fetch', 'retrieve'];
const postAliases = ['post', 'create', 'insert'];
const putAliases = ['put', 'update', 'patch'];
const upsertAliases = ['upsert'];
const deleteAliases = ['delete', 'remove'];

const allTriggersAndActions = Object.keys(component.triggers).concat(Object.keys(component.actions));

for (let i = 0; i < allTriggersAndActions.length; i += 1) {
 if (!result.get) {
   for (let alias of getAliases) {
     if (allTriggersAndActions[i].includes(alias)) {
       result.get = true;
       break;
     }
   }
 }

 if (!result.upsert) {
   for (let alias of upsertAliases) {
     if (allTriggersAndActions[i].includes(alias)) {
       result.upsert = true;
       result.post = true;
       result.put = true;
       break;
     }
   }
 }

 if (!result.post) {
   for (let alias of postAliases) {
     if (allTriggersAndActions[i].includes(alias)) {
       result.post = true;
       break;
     }
   }
 }

 if (!result.put) {
   for (let alias of putAliases) {
     if (allTriggersAndActions[i].includes(alias)) {
       result.put = true;
       break;
     }
   }
 }

 if (!result.delete) {
   for (let alias of deleteAliases) {
     if (allTriggersAndActions[i].includes(alias)) {
       result.delete = true;
       break;
     }
   }
 }
}

return result;
}

function checkDocumentation(component, readme) {

const result = {
  readme: false,
  size: false,
  error: false
}

if (readme && readme.length) result.readme = true;

const allTriggersAndActions = Object.keys(component.triggers).concat(Object.keys(component.actions));

const expectedLength = 500 + allTriggersAndActions.length * 100;

if (readme.length >= expectedLength) result.size = true;

return result;

}


module.exports = { checkInteroperability, checkDocumentation }
