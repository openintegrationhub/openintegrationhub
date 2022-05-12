/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index');
const log = require('../../config/logger');
const ComponentsData = require('../../models/componentsData');
const FlowData = require('../../models/flowData');
const FlowTemplateData = require('../../models/flowData');

// Retrieves all flow data entries
const getAllFlowData = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  filters,
  sortField,
  sortOrder,
  from,
  until,
  names,
  customFieldNames,
) => new Promise(async (resolve) => {
  if (!user.isAdmin) {
    // @todo: ferryman permissions
    resolve(false);
  }

  const qry = {};

  let fieldNames = 'id name updatedAt';
  if (names && Array.isArray(names) && names.length > 0) {
    qry.name = { $in: names };
    fieldNames = null;
  }

  if (customFieldNames) fieldNames = customFieldNames;

  // Add all filtered fields to query
  const filterFields = (filters) ? Object.keys(filters) : [];
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      qry[filterFields[i]] = filters[filterFields[i]];
    }
  }

  if (from) {
    qry.updatedAt = { $gte: new Date(from) };
  }

  if (until) {
    qry.updatedAt = { $lte: new Date(until) };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  // console.log('Query:', qry);
  // console.log('Fieldnames:', fieldNames);

  // count results
  const count = await FlowData.countDocuments(qry);

  // add offset and limit to query and execute

  const pageOffset = (pageNumber) ? ((pageNumber - 1) * pageSize) : 0;

  // console.log('pageOffset', pageOffset);

  FlowData.find(qry, fieldNames).sort(sort).skip(pageOffset).limit(pageSize)
    .lean()
    .then((doc) => {
      // console.log('doc', doc);
      const storedFunctionsList = doc;
      for (let i = 0; i < storedFunctionsList.length; i += 1) {
        storedFunctionsList[i] = format(storedFunctionsList[i]);
      }
      resolve({ data: storedFunctionsList, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});

// Creates a new flow data entry
const createFlowData = async (user, flowId, flowName) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    const newFlowData = {
      flowId,
      flowName,
      metaData: {
        oihUser: user.username,
      },
    };

    const storeFlowData = new FlowData(newFlowData);

    const response = await storeFlowData.save();
    return response._doc;
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Updates a existing flow data entry
const updateFlowData = async (user, flowId, data) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    if (!flowId) {
      return false;
    }

    const newFlowData = data;

    newFlowData.metaData = {
      oihUser: user.username,
    };

    return await FlowData.findOneAndUpdate({ flowId }, storeFlow, { upsert: false, new: true }).lean();
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Get's a single flow data entry
const getFlowData = async (user, flowId) => {
  if (!user.isAdmin) {
    return false;
  }

  if (!flowId) {
    return false;
  }

  const query = {
    flowId,
  };

  try {
    return await FlowData.findOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Deletes a flow data entry
const deleteFlowData = async (user, id) => {
  if (!user.isAdmin) {
    return false;
  }

  const query = {
    _id: id,
  };

  try {
    return await FlowData.deleteOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

module.exports = {
  createFlowData,
  updateFlowData,
  getFlowData,
  getAllFlowData,
  deleteFlowData,
  getFlowDataStatistic,
};
