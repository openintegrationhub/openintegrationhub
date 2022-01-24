const ComponentVersion = require('../../models/ComponentVersion');

module.exports = async function (req, res, next) {
    const componentVersionId = req.params.componentVersionId; 

    if (!mongoose.Types.ObjectId.isValid(componentVersionId)) {
      return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
    };

    const componentVersionData = await ComponentVersion.findOne({'_id': componentVersionId}).lean();

    req.logger.debug(componentVersionData);
    res.data = componentVersionData;
    return next();
};
