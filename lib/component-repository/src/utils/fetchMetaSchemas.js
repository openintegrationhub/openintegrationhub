const fetch = require('node-fetch');
const Component = require('../models/Component')


async function fetchMetaSchemas(repoUrl, componentId) {

  // Attempt to directly fetch the component repo from the designated repository
  const baseUrl = repoUrl.replace('https://github.com', 'https://raw.githubusercontent.com') + '/master/';

  const componentData = await Component.findOne(
    { _id: componentId },
  );

  componentData.actions
  componentData.triggers

  let hasChanged = false;
  let key;

  const mainKeys = ['actions', 'triggers'];
  const metaKeys = ['in', 'out'];
  for (let i=0; i<mainKeys.length; i+=1) {
    if (mainKeys[i] in componentData) {
      for (key in componentData[mainKeys[i]]) {
        if ('metadata' in componentData[mainKeys[i]][key]) {
          for (let j=0; j<metaKeys.length; j+=1) {
            if (metaKeys[j] in componentData[mainKeys[i]][key].metadata) {
              if ((typeof componentData[mainKeys[i]][key].metadata[metaKeys[j]]) === 'string') {
                let url = componentData[mainKeys[i]][key].metadata[metaKeys[j]].trim();
                if (url[0] === '.') url = url.substr(2);
                url = baseUrl + url;

                try {
                  let schemaJson;
                  const schemaResponse = await fetch(url);

                  if (schemaResponse.status === 200) {
                    schemaJson = await schemaResponse.json();
                  }

                  if (schemaJson) {
                    componentData[mainKeys[i]][key].metadata[metaKeys[j]] = schemaJson;
                    hasChanged = true;
                  } else {
                    console.error('Schema is not valid json:', url);
                  }
                } catch(e) {
                  console.error(e);
                }
              }
            }
          }
        }
      }
    }
  }

  if (hasChanged) {
    await Component.updateOne(
      { _id: componentId },
      {
        actions: componentData.actions,
        triggers: componentData.triggers,
      },
    )
  } else {
    console.log('No schemas updated for component:', componentId);
  }

  return true;
}

module.exports = { fetchMetaSchemas }
