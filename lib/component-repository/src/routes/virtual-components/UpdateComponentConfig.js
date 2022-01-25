const ComponentConfig = require('../../models/ComponentConfig');
const mongoose = require('mongoose');
module.exports = async function (req, res, next) {
  const { authClientId } = req.body;
  const { _id } = req.virtualComponent;
  const virtualComponentId = _id;
  const oldTenant = req.body.tenant ? req.body.tenant : req.user.tenant;
  if (!mongoose.Types.ObjectId.isValid(virtualComponentId)) {
    return res
      .status(400)
      .send({ errors: [{ message: 'Invalid id', code: 400 }] });
  };

  const qry = { virtualComponentId: virtualComponentId };
  const currentVersionCompConfig = await ComponentConfig.findOne(qry).lean();
  console.log("current",currentVersionCompConfig)
  const newCompConfig = {...currentVersionCompConfig, authClientId: authClientId};
  console.log("new",newCompConfig)

  delete newCompConfig._id;
  delete newCompConfig.createdAt;
  delete newCompConfig.updatedAt;
  const newConfig = await ComponentConfig.findByIdAndUpdate({_id: currentVersionCompConfig._id},{authClientId: authClientId }).lean();

  console.log(newConfig)
  res.data = newConfig;
//   const data = { 
//     authClientId: authClientId,
//     virtualComponentId: currentVersionCompConfig.virtualComponentId,
//     tenant: currentVersionCompConfig.tenant
// };

//   console.log("data",data)
//   console.log("current",currentVersionCompConfig)
//   if (!currentVersionCompConfig) {
//     return res.status(404).send({
//       errors: [
//         { message: 'This component version has not been found.', code: 404 },
//       ],
//     });
//   };

//   const newCompConfig = new ComponentConfig(data);

//   res.data = await newCompConfig.save(data);
  res.statusCode = 200;

  return next();
};
