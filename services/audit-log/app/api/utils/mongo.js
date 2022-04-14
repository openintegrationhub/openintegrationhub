/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

const mongoose = require('mongoose');
const config = require('../../config');
const log = require('../../config/logger');
const Log = require('../../models/log');

// Retrieves all logs for authorized owner or for admin irrespective of ownership.

const getLogs = async ( // eslint-disable-line
    user,
    pageSize,
    pageNumber,
    filters,
    sortField,
    sortOrder,
) => new Promise(async (resolve) => { // eslint-disable-line no-async-promise-executor
    const qry = { $and: [] };

    // If the user is not an admin, restrict viewing only to logs of the same user/tenant
    if (!config.oihAdminRoles.includes(user.role)) {
        qry.$and.push({
            $or: [
                { 'payload.user': user.sub },
                { 'payload.tenant': user.currentContext.tenant },
            ],
        });
    }

    // Add all filtered fields to query
    const filterFields = Object.keys(filters);
    const { length } = filterFields;
    if (length > 0) {
        let i;
        for (i = 0; i < length; i += 1) {
            if (filterFields[i] === 'service') {
                qry['headers.serviceName'] = filters.service;
            } else if (filterFields[i] === 'name') {
                qry['headers.name'] = filters.name;
            } else {
                qry[`payload.${filterFields[i]}`] = filters[filterFields[i]];
            }
        }
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
const getAnyLogById = (logId) => new Promise((resolve) => {
    const findId = new mongoose.Types.ObjectId(logId);
    Log.find({ '_id': findId }).lean()
        .then((doc) => {
            resolve(doc);
        })
        .catch((err) => {
            log.error(err);
        });
});

// Saves an event
const addEvent = (data) => new Promise((resolve) => {
    const newEvent = new Log(data);
    newEvent.save()
        .then((doc) => {
            resolve(doc._doc);
        })
        .catch((err) => {
            log.error(err);
        });
});

// Gets all logs pertaining to a particular user
const getByUser = (id) => new Promise((resolve) => {
    Log.find(
        { $or: [{ 'payload.id': id }, { 'payload.user': id }] },
    )
        .lean()
        .then((doc) => {
            resolve(doc);
        }).catch((err) => {
            log.error(err);
        });
});

const updatePayload = (id, payload) => new Promise((resolve) => {
    Log.findOneAndUpdate(
        { _id: id },
        { $set: { payload } },
    )
        .lean()
        .then((doc) => {
            resolve(doc._doc);
        }).catch((err) => {
            log.error(err);
        });
});

module.exports = {
    addEvent,
    getAnyLogById,
    getLogs,
    getByUser,
    updatePayload,
};
