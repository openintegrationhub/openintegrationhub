/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
const mongoose = require('mongoose');
const config = require('../../config/index.js');
const log = require('../../config/logger');
const FlowTemplate = require('../../models/flowTemplate');

const format = (template) => {
  const newTemplate = template;
  if (newTemplate) {
    newTemplate.id = newTemplate._id.toString();
    delete newTemplate._id;
    delete newTemplate.__v;
  }
  return newTemplate;
};

// Builds a query depending on user's tenants and permissions
const buildQuery = (user, permission, id) => {
  let findId;
  const qry = {};
  if (id) {
    findId = new mongoose.Types.ObjectId(id);
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

// Retrieves all templates for authorized owner or for admin irrespective of ownership.
const getTemplates = async ( // eslint-disable-line
  user,
  pageSize,
  pageNumber,
  searchString,
  filters,
  sortField,
  sortOrder,
) => new Promise(async (resolve) => {
  const qry = buildQuery(user, config.flowTemplateReadPermission, null);
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
  const count = await FlowTemplate.find(qry).estimatedDocumentCount();

  if (qry.$and.length === 0) {
    delete qry.$and;
  }
  // add offset and limit to query and execute
  FlowTemplate.find(qry).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize)
    .lean()
    .then((doc) => {
      const templates = doc;
      for (let i = 0; i < templates.length; i += 1) {
        templates[i] = format(templates[i]);
      }
      resolve({ data: templates, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});

const getTemplateById = (flowTemplateId, user) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowTemplateReadPermission, flowTemplateId);
  FlowTemplate.findOne(qry).lean()
    .then((doc) => {
      const template = format(doc);
      resolve(template);
    })
    .catch((err) => {
      log.error(err);
    });
});

const addTemplate = (storeTemplate) => new Promise((resolve) => {
  storeTemplate.save()
    .then((doc) => {
      const template = format(doc._doc);
      resolve(template);
    })
    .catch((err) => {
      log.error(err);
    });
});

const updateTemplate = (storeTemplate, user) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowTemplateWritePermission, storeTemplate.id);
  FlowTemplate.findOneAndUpdate(qry, storeTemplate,
    { upsert: false, new: true }).lean()
    .then((doc) => {
      const template = format(doc);
      resolve(template);
    })
    .catch((err) => {
      log.error(err);
    });
});

const publishTemplate = (user, flowTemplateId) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowTemplateControlPermission, flowTemplateId);

  FlowTemplate.findOneAndUpdate(
    qry,
    { $set: { status: 'published' } },
    { upsert: false, new: true },
  ).lean()
    .then((doc) => {
      const template = format(doc);

      resolve(template);
    })
    .catch((err) => {
      log.error(err);
    });
});

const unpublishTemplate = (user, flowTemplateId) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowTemplateControlPermission, flowTemplateId);

  FlowTemplate.findOneAndUpdate(
    qry,
    { $set: { status: 'draft' } },
    { upsert: false, new: true },
  ).lean()
    .then((doc) => {
      const template = format(doc);

      resolve(template);
    })
    .catch((err) => {
      log.error(err);
    });
});

const deleteTemplate = (flowTemplateId, user) => new Promise((resolve) => {
  const qry = buildQuery(user, config.flowTemplateWritePermission, flowTemplateId);
  FlowTemplate.findOneAndRemove(qry)
    .then((response) => {
      resolve(response);
    })
    .catch((err) => {
      log.error(err);
    });
});

const anonymise = (userId) => new Promise((resolve) => {
  FlowTemplate.update(
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

const getOrphanedTemplates = () => new Promise((resolve) => {
  FlowTemplate.find({
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
  getTemplates,
  addTemplate,
  publishTemplate,
  unpublishTemplate,
  updateTemplate,
  getTemplateById,
  deleteTemplate,
  anonymise,
  getOrphanedTemplates,
  format,
};
