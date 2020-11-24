/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index.js');
const log = require('../../config/logger');
const ProvenanceEvent = require('../../models/provenanceEvent');

const format = (provenanceEvent) => {
  const newProvenanceEvent = provenanceEvent;
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
    // if (user.tenant) owners.push(user.tenant);
    if (user.tenant) {
      qry['actedOnBehalfOf.id'] = user.tenant;
    }
    qry['actedOnBehalfOf.id'] = { $in: owners };
  }

  return qry;
};

// Retrieves all ProvenanceEvents for authorized owner or for admin irrespective of ownership.
const getProvenanceEvents = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  filters,
  sortField,
  sortOrder,
  from,
  until,
) => new Promise(async (resolve) => {
  const qry = buildQuery(user, config.ProvenanceEventReadPermission, null);

  // Add all filtered fields to query
  const filterFields = Object.keys(filters);
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      qry[filterFields[i]] = filters[filterFields[i]];
    }
  }

  if (from !== false) {
    qry['activity.startedAtTime'] = { $gte: new Date(from) };
  }

  if (until !== false) {
    qry['activity.endedAtTime'] = { $lte: new Date(until) };
  }


  // , sortField, sortOrder
  const sort = {};
  sort[sortField] = sortOrder;

  // count results
  const count = await ProvenanceEvent.find(qry).estimatedDocumentCount();

  // add offset and limit to query and execute
  ProvenanceEvent.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
    .lean()
    .then((doc) => {
      const provenanceEvents = doc;
      for (let i = 0; i < provenanceEvents.length; i += 1) {
        provenanceEvents[i] = format(provenanceEvents[i]);
      }
      resolve({ data: provenanceEvents, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});


const addProvenanceEvent = newProvenanceEvent => new Promise((resolve) => {
  const storeProvenanceEvent = new ProvenanceEvent(newProvenanceEvent);

  return storeProvenanceEvent.save()
    .then((doc) => {
      const provenanceEvent = format(doc._doc);
      resolve(provenanceEvent);
    })
    .catch((err) => {
      log.error(err);
      resolve(false);
    });
});


module.exports = {
  getProvenanceEvents,
  addProvenanceEvent,
};
