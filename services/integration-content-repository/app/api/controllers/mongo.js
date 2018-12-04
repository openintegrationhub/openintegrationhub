/* eslint no-use-before-define: "off" */

// require our MongoDB-Model
const Flow = require('../../models/flow');
const log = require('../../config/logger');

// Retrieves all flows for authorized owner or for admin irrespective of ownership.

const getFlows = async ( // eslint-disable-line
  credentials,
  pageSize,
  pageNumber,
  searchString,
  filters,
  sortField,
  sortOrder,
) => new Promise(async (resolve) => {
  const qry = { $and: [] };

  if (credentials !== 'admin') {
    qry.$and.push({ 'owners.id': { $in: credentials } });
  }

  // Add all filtered fields to query
  const filterFields = Object.keys(filters);
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      if (filterFields[i] === 'user') {
        qry['owners.id'] = filters.user;
      } else {
        qry[filterFields[i]] = filters[filterFields[i]];
      }
    }
  }

  if (searchString !== '') {
    const rx = new RegExp(searchString);
    qry.$and.push({
      $or: [
        {
          name: {
            $regex: rx,
          },
        },
        {
          description: {
            $regex: rx,
          },
        },
      ],
    });
  }

  // , sortField, sortOrder
  const sort = {};
  sort[sortField] = sortOrder;

  // count results
  const count = await Flow.find(qry).estimatedDocumentCount();

  if (qry.$and.length === 0) {
    delete qry.$and;
  }
  // add offset and limit to query and execute
  Flow.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
    .lean()
    .then((doc) => {
      resolve({ data: doc, meta: { total: count } });
    })
    .catch((err) => {
      log.debug(err);
    });
});

// Retrieves a specific flow by oihid, irrespective of ownership.
// Should only be available to internal methods or OIH-Admin
const getAnyFlowById = flowId => new Promise((resolve) => {
  Flow.find({ oihid: flowId })
    .then((doc) => {
      resolve(doc[0]);
    })
    .catch((err) => {
      log.debug(err);
    });
});


const addFlow = storeFlow => new Promise((resolve) => {
  storeFlow.save()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});

const updateFlow = (storeFlow, credentials) => new Promise((resolve) => {
  Flow.findOneAndUpdate({
    $and: [{ oihid: storeFlow.oihid },
      { 'owners.id': { $in: credentials } },
    ],
  }, storeFlow,
  { upsert: false, new: true })
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});


const getFlowById = (flowId, credentials) => new Promise((resolve) => {
  Flow.findOne({
    $and: [{ oihid: flowId },
      { 'owners.id': { $in: credentials } },
    ],
  }).lean()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.debug(err);
    });
});


const deleteFlow = (flowId, credentials) => new Promise((resolve) => {
  Flow.findOneAndRemove({
    $and: [
      { oihid: flowId },
      { 'owners.id': { $in: credentials } },
    ],
  })
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.debug(err);
    });
});


module.exports = {
  getAnyFlowById,
  getFlows,
  addFlow,
  updateFlow,
  getFlowById,
  deleteFlow,
};
