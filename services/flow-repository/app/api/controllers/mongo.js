/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const log = require('../../config/logger');
const Flow = require('../../models/flow');

// const ObjectId = mongoose.Types.ObjectId;

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
      log.error(err);
    });
});

// Retrieves a specific flow by id, irrespective of ownership.
// Should only be available to internal methods or OIH-Admin
const getAnyFlowById = flowId => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);
  Flow.find({ '_id': findId })
    .then((doc) => {
      resolve(doc[0]);
    })
    .catch((err) => {
      log.error(err);
    });
});


const addFlow = storeFlow => new Promise((resolve) => {
  storeFlow.save()
    .then((doc) => {
      resolve(doc._doc);
    })
    .catch((err) => {
      log.error(err);
    });
});

const updateFlow = (storeFlow, credentials) => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(storeFlow.id);
  Flow.findOneAndUpdate({
    $and: [{ '_id': findId },
      { 'owners.id': { $in: credentials } },
    ],
  }, storeFlow,
  { upsert: false, new: true })
    .then((doc) => {
      resolve(doc._doc);
    })
    .catch((err) => {
      log.error(err);
    });
});

const startFlow = (credentials, flowId) => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);

  let qry;
  if (credentials === 'admin') {
    qry = { '_id': findId };
  } else {
    qry = {
      $and: [{ '_id': findId },
        { 'owners.id': { $in: credentials } },
      ],
    };
  }

  Flow.findOneAndUpdate(
    qry,
    { $set: { status: 'active' } },
    { upsert: false, new: true },
  )
    .then((doc) => {
      resolve(doc._doc);
    })
    .catch((err) => {
      log.error(err);
    });
});

const stopFlow = (credentials, flowId) => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);

  let qry;
  if (credentials === 'admin') {
    qry = { '_id': findId };
  } else {
    qry = {
      $and: [{ '_id': findId },
        { 'owners.id': { $in: credentials } },
      ],
    };
  }

  Flow.findOneAndUpdate(
    qry,
    { $set: { status: 'inactive' } },
    { upsert: false, new: true },
  )
    .then((doc) => {
      resolve(doc._doc);
    })
    .catch((err) => {
      log.error(err);
    });
});


const getFlowById = (flowId, credentials) => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);
  Flow.findOne({
    $and: [{ '_id': findId },
      { 'owners.id': { $in: credentials } },
    ],
  }).lean()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.error(err);
    });
});


const deleteFlow = (flowId, credentials) => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);
  Flow.findOneAndRemove({
    $and: [
      { '_id': findId },
      { 'owners.id': { $in: credentials } },
    ],
  })
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.error(err);
    });
});


module.exports = {
  getAnyFlowById,
  getFlows,
  addFlow,
  startFlow,
  stopFlow,
  updateFlow,
  getFlowById,
  deleteFlow,
};
