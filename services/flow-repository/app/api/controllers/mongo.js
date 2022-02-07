/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index');
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
  if (!user.isAdmin) {
    const owners = [user.sub];
    if (user.tenant) owners.push(user.tenant);
    qry['owners.id'] = { $in: owners };
  }

  return qry;
};

const getTemplates = async ({ user, pageSize = 10, pageNumber = 0 }) => {
  const query = {
    isTemplate: true,
    $or: [
      {
        isGlobal: true,
      },
      {
        'owners.id': user.tenant,
      },
    ],
  };
  const data = await Promise.all([
    Flow.find(query).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
    Flow.find(query).countDocuments(),
  ]);

  data[0].forEach((flow) => {
    flow.graph.nodes.forEach((node) => {
      delete node.credentials_id;
    });
    flow.owners = flow.owners.filter(owner => owner.id === user.sub || owner.id === user.tenant);
  });

  return {
    data: data[0],
    meta: {
      count: data[1],
    },
  };
};

// Retrieves all flows for authorized owner or for admin irrespective of ownership.
const getFlows = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  searchString,
  filters,
  sortField,
  sortOrder,
) => new Promise(async (resolve) => {
  const qry = buildQuery(user, config.flowReadPermission, null);
  qry.$and = [];

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

const updateFlow = (storeFlow, user) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowWritePermission, storeFlow.id);
  Flow.findOneAndUpdate(qry, storeFlow,
    { upsert: false, new: true }).lean()
    .then((doc) => {
      const flow = format(doc);
      resolve(flow);
    })
    .catch((err) => {
      log.error(err);
    });
});

const startingFlow = (user, flowId) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowControlPermission, flowId);

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

const stoppingFlow = (user, flowId) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowControlPermission, flowId);

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

const deleteFlow = (flowId, user) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowWritePermission, flowId);
  Flow.findOneAndRemove(qry)
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.error(err);
    });
});

const anonymise = userId => new Promise((resolve) => {
  Flow.update(
    { 'owners.id': userId },
    { $pull: { owners: { id: userId } } },
    { multi: true },
  )
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.error(err);
    });
});

const getOrphanedFlows = () => new Promise((resolve) => {
  Flow.find({
    $or: [
      { owners: null },
      { owners: { $size: 0 } },
    ],
  })
    .lean()
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
  anonymise,
  getOrphanedFlows,
  format,
  getTemplates,
};
