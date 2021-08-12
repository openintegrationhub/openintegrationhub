const {fetchMeta} = require('../../utils/fetchMeta');
const {fetchMetaSchemas} = require('../../utils/fetchMetaSchemas');

module.exports = async function (req, res, next) {
    const {component} = req;
    const componentId = component.id || component._id;
    const repoUrl = req.query.repository || component.repository

    if (!repoUrl){
      const error = new Error('Missing Repository URL');
      error.statusCode = 400;
      throw error
    }

    await fetchMeta(repoUrl, componentId);
    await fetchMetaSchemas(repoUrl, componentId);

    res.statusCode = 204;
    return next();
};
