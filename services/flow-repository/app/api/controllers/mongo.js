/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index.js');
const log = require('../../config/logger');
const Flow = require('../../models/flow');

const format = (flow) => {
  const newFlow = flow;
  if (newFlow) {
    newFlow.id = newFlow._id.toString();
    delete newFlow._id;
    delete newFlow.__v;
  }
  return newFlow;
};

// Builds a query depending on user's tenants and permissions
const buildQuery = (user, permission, id) => {
  let findId;
  const qry = {};
  if (id) {
    findId = mongoose.Types.ObjectId(id);
    qry._id = findId;
  }

  // If the user is not an OIH admin, constrain query by flow ownership
  if (!config.oihAdminRoles.includes(user.role)) {
    const owners = [user.sub];

    for (let i = 0; i < user.memberships.length; i += 1) {
      if (user.memberships[i].permissions.includes(permission)) {
        owners.push(user.memberships[i].tenant);
      }
    }

    qry['owners.id'] = { $in: owners };
  }

  return qry;
};

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
      const flows = doc;
      for (let i = 0; i < flows.length; i += 1) {
        flows[i] = format(flows[i]);
      }
      resolve({ data: flows, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});

const getFlowById = (flowId, user) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowReadPermission, flowId);
  Flow.findOne(qry).lean()
    .then((doc) => {
      const flow = format(doc);
      resolve(flow);
    })
    .catch((err) => {
      log.error(err);
    });
});

const addFlow = storeFlow => new Promise((resolve) => {
  storeFlow.save()
    .then((doc) => {
      const flow = format(doc._doc);
      resolve(flow);
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
  { upsert: false, new: true }).lean()
    .then((doc) => {
      const flow = format(doc);
      resolve(flow);
    })
    .catch((err) => {
      log.error(err);
    });
});

const startingFlow = (credentials, flowId) => new Promise((resolve) => {
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
    { $set: { status: 'starting' } },
    { upsert: false, new: true },
  ).lean()
    .then((doc) => {
      const flow = format(doc);

      resolve(flow);
    })
    .catch((err) => {
      log.error(err);
    });
});

const stoppingFlow = (credentials, flowId) => new Promise((resolve) => {
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
    { $set: { status: 'stopping' } },
    { upsert: false, new: true },
  ).lean()
    .then((doc) => {
      const flow = format(doc);

      resolve(flow);
    })
    .catch((err) => {
      log.error(err);
    });
});

const startedFlow = flowId => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);

  const qry = { '_id': findId };

  Flow.findOneAndUpdate(
    qry,
    { $set: { status: 'active' } },
    { upsert: false, new: true },
  ).lean()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.error(err);
    });
});

const stoppedFlow = flowId => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(flowId);

  const qry = { '_id': findId };

  Flow.findOneAndUpdate(
    qry,
    { $set: { status: 'inactive' } },
    { upsert: false, new: true },
  ).lean()
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
  getFlows,
  addFlow,
  startingFlow,
  stoppingFlow,
  startedFlow,
  stoppedFlow,
  updateFlow,
  getFlowById,
  deleteFlow,
};
