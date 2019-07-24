/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

const mongoose = require('mongoose');
const log = require('../../config/logger');
const Log = require('../../models/log');

// Retrieves all logs for authorized owner or for admin irrespective of ownership.

const getLogs = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  searchString,
  filters,
  sortField,
  sortOrder,
) => new Promise(async (resolve) => {
  const qry = { $and: [] };

  // Add all filtered fields to query
  const filterFields = Object.keys(filters);
  const { length } = filterFields;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      if (filterFields[i] === 'service') {
        qry['headers.serviceName'] = filters.service;
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
          'payload.action': {
            $regex: rx,
          },
        },
        {
          'payload.details': {
            $regex: rx,
          },
        },
      ],
    });
  }

  // , sortField, sortOrder
  const sort = {};
  sort[sortField] = sortOrder;

  if (qry.$and.length === 0) {
    delete qry.$and;
  }


  // count results
  const count = await Log.find(qry).estimatedDocumentCount();
  const doc = await Log.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
    .lean();

  resolve({ data: doc, meta: { total: count } });
  // add offset and limit to query and execute
  // Log.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
  //   .lean()
  //   .then((doc) => {
  //     resolve({ data: doc, meta: { total: count } });
  //   })
  //   .catch((err) => {
  //     log.error(err);
  //   });
});


// Should only be available to internal methods or OIH-Admin
const getAnyLogById = logId => new Promise((resolve) => {
  const findId = mongoose.Types.ObjectId(logId);
  Log.find({ '_id': findId }).lean()
    .then((doc) => {
      resolve(doc);
    })
    .catch((err) => {
      log.error(err);
    });
});

// Saves an event
const addEvent = data => new Promise((resolve) => {
  const newEvent = new Log(data);
  newEvent.save()
    .then((doc) => {
      resolve(doc._doc);
    })
    .catch((err) => {
      log.error(err);
    });
});

// Anonymises a user id according to gdpr guidelines
const anonymise = id => new Promise((resolve) => {
  Log.update(
    { 'payload.id': id },
    { $set: { 'payload.id': 'XXXXXXXXXX' } },
  ).then((doc) => {
    resolve(doc._doc);
  }).catch((err) => {
    log.error(err);
  });
});


module.exports = {
  addEvent,
  getAnyLogById,
  getLogs,
  anonymise,
};
