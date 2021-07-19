const fetch = require('node-fetch');
const Component = require('../models/Component')

async  function fetchMeta(repoUrl, componentId) {

  // Attempt to directly fetch the component repo from the designated repository
  const componentUrl = repoUrl.replace('https://github.com', 'https://raw.githubusercontent.com') + '/master/component.json';

  let componentJson;
  const componentResponse = await fetch(componentUrl);

  if (componentResponse.status === 200) {
    componentJson = componentResponse.json();
  }

  if (!componentJson) return false

  const component = await Component.findOne({ _id: componentId })

  component.actions = componentJson.actions;
  component.triggers= componentJson.triggers;

  await Component.save();
}

module.exports = { fetchMeta }
