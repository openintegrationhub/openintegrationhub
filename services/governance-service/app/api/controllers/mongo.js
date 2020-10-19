/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index.js');
const log = require('../../config/logger');
const ProvenanceEvents = require('../../models/provenanceEvents');

const format = (ProvenanceEvent) => {
  const newProvenanceEvent = ProvenanceEvent;
  if (newProvenanceEvent) {
    newProvenanceEvent.id = newProvenanceEvent._id.toString();
    delete newProvenanceEvent._id;
    delete newProvenanceEvent.__v;
  }
  return newProvenanceEvent;
};

// Builds a query depending on user's tenants and permissions
const buildQuery = (user, permission, id) => {
  let findId;
  const qry = {};
  if (id) {
    findId = mongoose.Types.ObjectId(id);
    qry._id = findId;
  }

  // If the user is not an OIH admin, constrain query by ProvenanceEvent ownership
  if (!user.isAdmin) {
    const owners = [user.sub];
    if (user.tenant) owners.push(user.tenant);
    qry['owners.id'] = { $in: owners };
  }

  return qry;
};

// Retrieves all ProvenanceEvents for authorized owner or for admin irrespective of ownership.
const getProvenanceEvents = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  searchString,
  filters,
  sortField,
  sortOrder,
) => new Promise(async (resolve) => {
  const qry = buildQuery(user, config.ProvenanceEventReadPermission, null);
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
  const count = await ProvenanceEvent.find(qry).estimatedDocumentCount();

  if (qry.$and.length === 0) {
    delete qry.$and;
  }
  // add offset and limit to query and execute
  ProvenanceEvent.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
    .lean()
    .then((doc) => {
      const ProvenanceEvents = doc;
      for (let i = 0; i < ProvenanceEvents.length; i += 1) {
        ProvenanceEvents[i] = format(ProvenanceEvents[i]);
      }
      resolve({ data: ProvenanceEvents, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});


const addProvenanceEvent = storeProvenanceEvent => new Promise((resolve) => {
  storeProvenanceEvent.save()
    .then((doc) => {
      const ProvenanceEvent = format(doc._doc);
      resolve(ProvenanceEvent);
    })
    .catch((err) => {
      log.error(err);
    });
});



module.exports = {
  getProvenanceEvents,
  addProvenanceEvent,
};
