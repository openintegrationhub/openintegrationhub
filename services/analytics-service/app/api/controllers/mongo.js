/* eslint no-use-before-define: "off" */
/* eslint no-underscore-dangle: "off" */
/* eslint quote-props: "off" */

// require our MongoDB-Model
// const mongoose = require('mongoose');

const log = require('../../config/logger');

// const ComponentsData = require('../../models/componentsData');
// const FlowData = require('../../models/flowData');
// const FlowTemplateData = require('../../models/flowData');

const modelCreator = require('../../models/modelCreator');

const { decideBucket } = require('../../utils/helpers');

// const config = require('../../config/index');

// Retrieves all flow data entries
const getAllFlowData = async ( // eslint-disable-line
  timeFrame,
  user,
  pageSize,
  pageNumber,
  filters,
  sortField,
  sortOrder,
  from,
  until,
  customFieldNames,
) => new Promise(async (resolve) => {
  if (!user.isAdmin) {
    // @todo: ferryman permissions
    resolve(false);
  }

  const qry = {};
  qry.owners = user.tenant;

  let fieldNames;
  if (customFieldNames) fieldNames = customFieldNames;

  // Add all filtered fields to query
  const filterFields = (filters) ? Object.keys(filters) : [];
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      qry[filterFields[i]] = filters[filterFields[i]];
    }
  }

  if (from) {
    qry.updatedAt = { $gte: new Date(from) };
  }

  if (until) {
    qry.updatedAt = { $lte: new Date(until) };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  const collectionKey = `flows_${timeFrame}`;

  const count = await modelCreator.models[collectionKey].countDocuments(qry);

  const pageOffset = (pageNumber) ? ((pageNumber - 1) * pageSize) : 0;

  modelCreator.models[collectionKey].find(qry, fieldNames).sort(sort).skip(pageOffset).limit(pageSize)
    .lean()
    .then((doc) => {
      const flowsList = doc;
      resolve({ data: flowsList, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});

// Creates a new flow data entry
const createFlowData = async (timeFrame, user, flowData) => {
  try {
    if (!user.isAdmin) {
      console.log('Error: User is not admin');
      return false;
    }

    const newFlowData = flowData;
    const collectionKey = `flows_${timeFrame}`;
    const storeFlowData = new modelCreator.models[collectionKey](newFlowData);

    const response = await storeFlowData.save();
    return response._doc;
  } catch (e) {
    console.log(e);
    log.error(e);
    return false;
  }
};

// Updates flow stats across the timeline
const updateFlowStats = async (stats) => {
  try {
    const models = modelCreator.getModelsByType('flowStats');
    const now = new Date();
    const promises = [];

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i];

      const currentObject = await currentModel.findOne({ createdAt: { $lte: now }, intervalEnd: { $gte: now } }).lean();

      if (!currentObject) {
        promises.push(new currentModel(stats).save());
      } else {
        // TODO: Use some sort of weighted average for better accuracy
        const averageActive = Math.round((stats.active + currentObject.active) / 2);
        const averageInactive = Math.round((stats.inactive + currentObject.inactive) / 2);

        promises.push(currentModel.updateOne({ _id: currentObject._id }, { active: averageActive, inactive: averageInactive }));
      }
    }

    await Promise.all(promises);
    return true;
  } catch (e) {
    console.log(e);
    log.error(e);
    return false;
  }
};

// Updates flow stats across the timeline
const getFlowStats = async (interval, from, until) => {
  try {
    const query = {};

    if (from) query.createdAt = { $gte: from };
    if (until) query.intervalEnd = { $lte: until };

    const flowStats = await modelCreator.models[`flowStats_${interval}`].find(query).sort({ createdAt: 1 });
    const count = await modelCreator.models[`flowStats_${interval}`].countDocuments();

    return {
      data: flowStats,
      meta: { count },
    };
  } catch (e) {
    console.log(e);
    log.error(e);
    return { data: [], meta: { count: 0 } };
  }
};

// Updates a existing flow data entry
const updateFlowData = async (timeFrame, user, flowId, data) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    if (!flowId) {
      return false;
    }

    const newFlowData = data;

    const collectionKey = `flows_${timeFrame}`;
    newFlowData.owners = [
      user.tenant,
    ];

    return await modelCreator.models[collectionKey].findOneAndUpdate({ flowId }, newFlowData, { upsert: false, new: true }).lean();
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Get's a single flow data entry
const getFlowData = async (timeFrame, user, flowId) => {
  if (!user.isAdmin) {
    return false;
  }

  if (!flowId) {
    return false;
  }

  const query = {
    flowId,
  };

  try {
    const collectionKey = `flows_${timeFrame}`;
    return await modelCreator.models[collectionKey].findOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Deletes a flow data entry
const deleteFlowData = async (timeFrame, user, id) => {
  if (!user.isAdmin) {
    return false;
  }

  const query = {
    _id: id,
  };

  try {
    const collectionKey = `flows_${timeFrame}`;
    return await modelCreator.models[collectionKey].deleteOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Retrieves all flow data entries
const getAllFlowTemplateData = async ( // eslint-disable-line
  timeFrame,
  user,
  pageSize,
  pageNumber,
  filters,
  sortField,
  sortOrder,
  from,
  until,
  customFieldNames,
) => new Promise(async (resolve) => {
  if (!user.isAdmin) {
    // @todo: ferryman permissions
    resolve(false);
  }

  const qry = {};
  qry.owners = user.tenant;

  let fieldNames;
  if (customFieldNames) fieldNames = customFieldNames;

  // Add all filtered fields to query
  const filterFields = (filters) ? Object.keys(filters) : [];
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      qry[filterFields[i]] = filters[filterFields[i]];
    }
  }

  if (from) {
    qry.updatedAt = { $gte: new Date(from) };
  }

  if (until) {
    qry.updatedAt = { $lte: new Date(until) };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  const collectionKey = `flowTemplates_${timeFrame}`;
  const count = await modelCreator.models[collectionKey].countDocuments(qry);

  const pageOffset = (pageNumber) ? ((pageNumber - 1) * pageSize) : 0;

  modelCreator.models[collectionKey].find(qry, fieldNames).sort(sort).skip(pageOffset).limit(pageSize)
    .lean()
    .then((doc) => {
      const flowTemplatesList = doc;
      resolve({ data: flowTemplatesList, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});

// Creates a new flow data entry
const createFlowTemplateData = async (timeFrame, user, flowTemplateId, flowTemplateName) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    const newFlowTemplateData = {
      flowTemplateId,
      flowTemplateName,
      owners: [
        user.tenant,
      ],
    };

    const collectionKey = `flowTemplates_${timeFrame}`;
    const storeFlowTemplateData = new modelCreator.models[collectionKey](newFlowTemplateData);

    const response = await storeFlowTemplateData.save();
    return response._doc;
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Updates a existing flow data entry
const updateFlowTemplateData = async (timeFrame, user, flowTemplateId, data) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    if (!flowTemplateId) {
      return false;
    }

    const newFlowTemplateData = data;

    newFlowTemplateData.owners = [
      user.tenant,
    ];

    const collectionKey = `flowTemplates_${timeFrame}`;
    return await modelCreator.models[collectionKey].findOneAndUpdate({ flowTemplateId }, newFlowTemplateData, { upsert: false, new: true }).lean();
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Get's a single flow data entry
const getFlowTemplateData = async (timeFrame, user, flowTemplateId) => {
  if (!user.isAdmin) {
    return false;
  }

  if (!flowTemplateId) {
    return false;
  }

  const query = {
    flowTemplateId,
  };

  try {
    const collectionKey = `flowTemplates_${timeFrame}`;
    return await modelCreator.models[collectionKey].findOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Deletes a flow data entry
const deleteFlowTemplateData = async (timeFrame, user, id) => {
  if (!user.isAdmin) {
    return false;
  }

  const query = {
    _id: id,
  };

  try {
    const collectionKey = `flowTemplates_${timeFrame}`;
    return await modelCreator.models[collectionKey].deleteOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Retrieves all flow data entries
const getAllComponentsData = async ( // eslint-disable-line
  timeFrame,
  user,
  pageSize,
  pageNumber,
  filters,
  sortField,
  sortOrder,
  from,
  until,
  customFieldNames,
) => new Promise(async (resolve) => {
  if (!user.isAdmin) {
    // @todo: ferryman permissions
    resolve(false);
  }

  const qry = {};
  qry.owners = user.tenant;

  let fieldNames;
  if (customFieldNames) fieldNames = customFieldNames;

  // Add all filtered fields to query
  const filterFields = (filters) ? Object.keys(filters) : [];
  const length = filterFields.length;
  if (length > 0) {
    let i;
    for (i = 0; i < length; i += 1) {
      qry[filterFields[i]] = filters[filterFields[i]];
    }
  }

  if (from) {
    qry.updatedAt = { $gte: new Date(from) };
  }

  if (until) {
    qry.updatedAt = { $lte: new Date(until) };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  const collectionKey = `components_${timeFrame}`;
  const count = await modelCreator.models[collectionKey].countDocuments(qry);

  const pageOffset = (pageNumber) ? ((pageNumber - 1) * pageSize) : 0;

  modelCreator.models[collectionKey].find(qry, fieldNames).sort(sort).skip(pageOffset).limit(pageSize)
    .lean()
    .then((doc) => {
      const componentsList = doc;
      resolve({ data: componentsList, meta: { total: count } });
    })
    .catch((err) => {
      log.error(err);
    });
});

// Creates a new flow data entry
const createComponentsData = async (timeFrame, user, componentId, componentName) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    const newComponentsData = {
      componentId,
      componentName,
      owners: [
        user.tenant,
      ],
    };

    const collectionKey = `components_${timeFrame}`;
    const storeComponentsData = new modelCreator.models[collectionKey](newComponentsData);

    const response = await storeComponentsData.save();
    return response._doc;
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Updates a existing component data entry
const updateComponentsData = async (timeFrame, user, componentId, data) => {
  try {
    if (!user.isAdmin) {
      return false;
    }

    if (!componentId) {
      return false;
    }

    const newComponentsData = data;

    const collectionKey = `components_${timeFrame}`;
    newComponentsData.owners = [
      user.tenant,
    ];

    return await modelCreator.models[collectionKey].findOneAndUpdate({ componentId }, newComponentsData, { upsert: false, new: true }).lean();
  } catch (e) {
    log.error(e);
    return false;
  }
};

// Get's a single flow data entry
const getComponentsData = async (timeFrame, user, componentId) => {
  if (!user.isAdmin) {
    return false;
  }

  if (!componentId) {
    return false;
  }

  const query = {
    componentId,
  };

  try {
    const collectionKey = `components_${timeFrame}`;
    return await modelCreator.models[collectionKey].findOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Deletes a flow data entry
const deleteComponentsData = async (timeFrame, user, id) => {
  if (!user.isAdmin) {
    return false;
  }

  const query = {
    _id: id,
  };

  try {
    const collectionKey = `components_${timeFrame}`;
    return await modelCreator.models[collectionKey].deleteOne(
      query,
    ).lean().exec();
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Adds a errorMessage to a flowData entry, create a new flow data entry if required
const addFlowErrorMessage = async (timeFrame, message) => {
  try {
    const collectionKey = `flows_${timeFrame}`;
    console.log('collectionKey', collectionKey);

    const errorMessage = {
      componentId: message.componentId,
      errorName: message.errorName,
      errorText: message.errorText,
      errorStack: message.errorStack,
      timestamp: message.timestamp,
    };

    const errorEntry = {
      flowId: message.flowId,
      $push: {
        errorData: errorMessage,
        owners: message.tenantId,
      },
      $inc: { errorCount: 1 },
    };

    return await modelCreator.models[collectionKey].updateOne({ flowId: message.flowId }, errorEntry, { upsert: true });
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Adds usage to a flow template entry, create a new flow template entry if required, across the timeline
const upsertFlowTemplateUsage = async (flowTemplateId, flowIds) => {
  try {
    const models = modelCreator.getModelsByType('flowTemplates');
    const now = new Date();
    const promises = [];

    const flows = [];
    for (let i = 0; i < flowIds.length; i += 1) {
      flows.push({ flowId: flowIds[i] });
    }

    const dataEntry = {
      flowTemplateId,
      $push: {
        usage: {
          $each: flows,
        },
      },
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i];
      promises.push(currentModel.updateOne(
        { flowTemplateId, createdAt: { $lte: now }, intervalEnd: { $gte: now } },
        dataEntry,
        { upsert: true, setDefaultsOnInsert: true },
      ));
    }

    await Promise.all(promises);
    return true;
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Adds usage to a component entry, create a new component entry if required, across the timeline
const upsertComponentUsage = async (componentId, flowIds) => {
  try {
    const models = modelCreator.getModelsByType('components');
    const now = new Date();
    const promises = [];

    const flows = [];
    for (let i = 0; i < flowIds.length; i += 1) {
      flows.push({ objectId: flowIds[i] }); // flowId ?
    }

    const dataEntry = {
      componentId,
      $push: {
        usage: {
          $each: flows,
        },
      },
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i];
      promises.push(currentModel.updateOne(
        { componentId, createdAt: { $lte: now }, intervalEnd: { $gte: now } },
        dataEntry,
        { upsert: true, setDefaultsOnInsert: true },
      ));
    }

    await Promise.all(promises);
    return true;
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Creates or updates components entry, across the timeline
const upsertComponent = async (componentData) => {
  try {
    const models = modelCreator.getModelsByType('components');
    const now = new Date();
    const promises = [];

    const dataEntry = {
      componentId: componentData.artifactId,
      componentName: componentData.name,
      owners: componentData.owners,
      status: (componentData.active) ? 'active' : 'inactive',
      // statusChangedAt: Date.now(),
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i];
      promises.push(currentModel.updateOne(
        { componentId: componentData.artifactId, createdAt: { $lte: now }, intervalEnd: { $gte: now } },
        dataEntry,
        { upsert: true, setDefaultsOnInsert: true },
      ));
    }

    await Promise.all(promises);
    return true;
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Creates or updates flowTemplates entry, across the timeline
const upsertFlowTemplate = async (templateData) => {
  try {
    const models = modelCreator.getModelsByType('flowTemplates');
    const promises = [];

    let steps = '0';
    if (templateData.graph && templateData.graph.edges) {
      steps = `${templateData.graph.edges.length + 1}`;
    }

    const dataEntry = {
      flowTemplateId: templateData.id,
      flowTemplateName: templateData.name,
      owners: templateData.owners,
      createdAt: Date.now(),
      steps,
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i].model;
      const createdAt = decideBucket(dataEntry.createdAt, models[i].timeWindow);
      const max = createdAt + models[i].timeWindow * 60 * 1000;
      promises.push(currentModel.updateOne(
        { flowTemplateId: templateData.id, createdAt: { $gte: createdAt, $lte: max } },
        dataEntry,
        { upsert: true, setDefaultsOnInsert: true },
      ));
    }

    await Promise.all(promises);
    return true;
  } catch (err) {
    log.error(err);
  }
  return false;
};

module.exports = {
  createFlowData,
  updateFlowData,
  getFlowData,
  getAllFlowData,
  deleteFlowData,
  // getFlowDataStatistic,
  createFlowTemplateData,
  updateFlowTemplateData,
  getFlowTemplateData,
  getAllFlowTemplateData,
  deleteFlowTemplateData,
  // getFlowTemplateDataStatistic,
  createComponentsData,
  updateComponentsData,
  getComponentsData,
  getAllComponentsData,
  deleteComponentsData,
  // getComponentsDataStatistic,
  updateFlowStats,
  getFlowStats,
  addFlowErrorMessage,

  upsertFlowTemplateUsage,
  upsertComponentUsage,

  upsertComponent,
  upsertFlowTemplate,
};
