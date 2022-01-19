const fetch = require('node-fetch');
const Component = require('../models/Component')
const { checkInteroperability, checkDocumentation } = require('./rating')

async function fetchMeta(repoUrl, componentId) {

  // Attempt to directly fetch the component repo from the designated repository
  const componentUrl = repoUrl.replace('https://github.com', 'https://raw.githubusercontent.com') + '/master/component.json';

  let componentJson;
  const componentResponse = await fetch(componentUrl);

  if (componentResponse.status === 200) {
    componentJson = await componentResponse.json();
  }

  if (!componentJson) return false

  const interoperability = checkInteroperability(componentJson) || {};

  let documentation = {}
  const readmeUrl = repoUrl.replace('https://github.com', 'https://raw.githubusercontent.com') + '/master/Readme.md';
  const readme = await fetch(readmeUrl);

  if (readme.status === 200) {
    const readmeText = await readme.text();
    documentation = checkDocumentation(componentJson, readmeText)
  }

  const rating = {
    interoperability,
    documentation
  }

  await Component.updateOne(
    { _id: componentId },
    {
      actions: componentJson.actions,
      triggers: componentJson.triggers,
      rating,
      repository: repoUrl,
    },
  )

  return true;
}

module.exports = { fetchMeta }
