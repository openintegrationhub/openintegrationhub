/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index.js');
const log = require('../../config/logger');
const ProvenanceEvent = require('../../models/provenanceEvent');
const StoredFunction = require('../../models/storedFunction');

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


// Retrieves all stored functions for authorized owner or for admin irrespective of ownership.
const getStoredFunctions = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  filters,
  sortField,
  sortOrder,
  from,
  until,
  names,
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
    qry.updatedAt = { $gte: new Date(from) };
  }

  if (until !== false) {
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
  const count = await StoredFunction.find(qry).estimatedDocumentCount();

  // add offset and limit to query and execute

  const pageOffset = (pageNumber) ? ((pageNumber - 1) * pageSize) : 0;

  StoredFunction.find(qry, fieldNames).sort(sort).skip(pageOffset).limit(pageSize)
    .lean()
    .then((doc) => {
      const storedFunctions = doc;
      for (let i = 0; i < storedFunctions.length; i += 1) {
        storedFunctions[i] = format(storedFunctions[i]);
      }
      resolve({ data: storedFunctions, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});


// Adds a new stored function
const addStoredFunction = async (user, name, code) => new Promise((resolve) => {
  if (!user.isAdmin) {
    return false;
  }

  const newStoredFunction = {
    name,
    code,
    metaData: {
      oihUser: user.username,
    },
  };

  const storeStoredFunction = new StoredFunction(newStoredFunction);

  return storeStoredFunction.save()
    .then((doc) => {
      const storedFunction = format(doc._doc);
      resolve(storedFunction);
    })
    .catch((err) => {
      log.error(err);
      resolve(false);
    });
});

// Deletes a stored function
const deleteStoredFunction = async (user, id) => {
  if (!user.isAdmin) {
    return false;
  }

  const query = {
    _id: id,
  };

  try {
    return await StoredFunction.deleteOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

module.exports = {
  getProvenanceEvents,
  addProvenanceEvent,
  getStoredFunctions,
  addStoredFunction,
  deleteStoredFunction,
};
