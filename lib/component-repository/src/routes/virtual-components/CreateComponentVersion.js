const ComponentVersion = require('../../models/ComponentVersion');
const { validate } = require('../../utils/validator');

module.exports = async function (req, res, next) {
  const { body } = req;
  const data = body;

  if(data._id){
    delete data._id;
  }



  const componentVersion = new ComponentVersion(data);
  const errors = validate(componentVersion);

  if (errors && errors.length > 0) {
    return res.status(400).send({ errors });
  }

  res.data = await ComponentVersion.create(data);
  res.statusCode = 201;

  return next();
};
