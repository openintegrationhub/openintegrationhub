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

const config = require('../../config/index');

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
    const start = decideBucket(from, config.timeWindows[timeFrame]);
    qry.bucketStartAt = { $gte: start };
  }

  if (until) {
    if (!qry.bucketStartAt) qry.bucketStartAt = {};
    const end = decideBucket(from, config.timeWindows[timeFrame]);
    qry.bucketStartAt = { $lte: end };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  if (config.timeWindows[timeFrame] > 1440 && 'day' in config.timeWindows) {
    // Group day buckets
    const collectionKey = 'flows_day';
    resolve(await modelCreator.models[collectionKey].aggregate([
      { '$match': qry },
      {
        '$group': {
          _id: {
            year: { $year: '$bucketStartAt' },
            month: { $month: '$bucketStartAt' },
            timeFrame: {
              '$dateTrunc': { date: '$bucketStartAt', unit: 'minute', binSize: config.timeWindows[timeFrame] },
            },
          },
          errorData: {
            $push: '$errorData',
          },
          usage: {
            $push: '$usage.objectId',
          },
          owners: {
            $push: '$owners',
          },
        },
      },
      {
        $project: {
          'errorData': {
            $reduce: {
              input: '$errorData',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
          'usage': {
            $reduce: {
              input: '$usage',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
          'owners': {
            $reduce: {
              input: '$owners',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
    ]));
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
      log.error('Error: User is not admin');
      return false;
    }

    const newFlowData = flowData;
    const collectionKey = `flows_${timeFrame}`;
    const storeFlowData = new modelCreator.models[collectionKey](newFlowData);

    const response = await storeFlowData.save();
    return response._doc;
  } catch (e) {
    log.error(e);
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
      const currentModel = models[i].model;
      const bucketStartAt = decideBucket(now, models[i].timeWindow);
      const before = bucketStartAt - models[i].timeWindow;

      const currentObject = await currentModel.findOne({ bucketStartAt: { $lte: now, $gte: before } }).lean();

      if (!currentObject) {
        const newStats = {
          active: stats.active,
          inactive: stats.inactive,
          bucketStartAt,
        };
        promises.push(new currentModel(newStats).save());
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
    log.error(e);
    log.error(e);
    return false;
  }
};

// Updates flow stats across the timeline
const getFlowStats = async (interval, from, until) => {
  try {
    const query = {};

    if (from && until) query.bucketStartAt = { $gte: from, $lte: until };
    else if (from) query.bucketStartAt = { $gte: from };
    else if (until) query.bucketStartAt = { $lte: until };

    const flowStats = await modelCreator.models[`flowStats_${interval}`].find(query).sort({ createdAt: 1 });
    const count = await modelCreator.models[`flowStats_${interval}`].countDocuments();

    return {
      data: flowStats,
      meta: { count },
    };
  } catch (e) {
    log.error(e);
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
    const start = decideBucket(from, config.timeWindows[timeFrame]);
    qry.bucketStartAt = { $gte: start };
  }

  if (until) {
    if (!qry.bucketStartAt) qry.bucketStartAt = {};
    const end = decideBucket(from, config.timeWindows[timeFrame]);
    qry.bucketStartAt = { $lte: end };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  if (config.timeWindows[timeFrame] > 1440 && 'day' in config.timeWindows) {
    // Group day buckets
    const collectionKey = 'flowTemplates_day';
    resolve(await modelCreator.models[collectionKey].aggregate([
      { '$match': qry },
      {
        '$group': {
          _id: {
            year: { $year: '$bucketStartAt' },
            month: { $month: '$bucketStartAt' },
            timeFrame: {
              '$dateTrunc': { date: '$bucketStartAt', unit: 'minute', binSize: config.timeWindows[timeFrame] },
            },
          },
          usage: {
            $push: '$usage.objectId',
          },
          owners: {
            $push: '$owners',
          },
        },
      },
      {
        $project: {
          'usage': {
            $reduce: {
              input: '$usage',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
          'owners': {
            $reduce: {
              input: '$owners',
              initialValue: [],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
    ]));
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
  if (user && user.tenant) qry.owners = user.tenant;

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
    const start = decideBucket(from, config.timeWindows[timeFrame]);
    qry.bucketStartAt = { $gte: start };
  }

  if (until) {
    if (!qry.bucketStartAt) qry.bucketStartAt = {};
    const end = decideBucket(from, config.timeWindows[timeFrame]);
    qry.bucketStartAt = { $lte: end };
  }

  // , sortField, sortOrder
  const sort = {};

  if (sortField && sortOrder) {
    sort[sortField] = sortOrder;
  } else {
    sort.updatedAt = 1;
  }

  try {
    if (config.timeWindows[timeFrame] > 1440 && 'day' in config.timeWindows) {
      // Group day buckets
      const collectionKey = 'components_day';
      resolve(await modelCreator.models[collectionKey].aggregate([
        { '$match': qry },
        {
          '$group': {
            _id: {
              year: { $year: '$bucketStartAt' },
              month: { $month: '$bucketStartAt' },
              timeFrame: {
                '$dateTrunc': { date: '$bucketStartAt', unit: 'minute', binSize: config.timeWindows[timeFrame] },
              },
            },
            errorData: {
              $push: '$errorData',
            },
            usage: {
              $push: '$usage.objectId',
            },
            owners: {
              $push: '$owners',
            },
          },
        },
        {
          $project: {
            'errorData': {
              $reduce: {
                input: '$errorData',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] },
              },
            },
            'usage': {
              $reduce: {
                input: '$usage',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] },
              },
            },
            'owners': {
              $reduce: {
                input: '$owners',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] },
              },
            },
          },
        },
      ]));
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
  } catch (e) {
    log.error(e);
    resolve(false);
  }
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
    const timeWindow = config.timeWindows[timeFrame];
    const bucketStartAt = decideBucket(message.timestamp, timeWindow);
    const max = bucketStartAt + timeWindow * 60 * 1000;

    const collectionKey = `flows_${timeFrame}`;

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
      createdAt: message.timestamp,
      bucketStartAt,
    };

    return await modelCreator.models[collectionKey].updateOne({ flowId: message.flowId, bucketStartAt: { $gte: bucketStartAt, $lte: max } }, errorEntry, { upsert: true });
  } catch (err) {
    log.error(err);
  }
  return false;
};

// Adds usage to a flow template entry, create a new flow template entry if required, across the timeline
const upsertFlowTemplateUsage = async (flowTemplateId, flowIds) => {
  try {
    const models = modelCreator.getModelsByType('flowTemplates');
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
      createdAt: Date.now(),
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i].model;
      const bucketStartAt = decideBucket(dataEntry.createdAt, models[i].timeWindow);
      dataEntry.bucketStartAt = bucketStartAt;
      const max = bucketStartAt + models[i].timeWindow * 60 * 1000;
      promises.push(currentModel.updateOne(
        { flowTemplateId, bucketStartAt: { $gte: bucketStartAt, $lte: max } },
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
      createdAt: Date.now(),
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i].model;
      const bucketStartAt = decideBucket(dataEntry.createdAt, models[i].timeWindow);
      dataEntry.bucketStartAt = bucketStartAt;
      const max = bucketStartAt + models[i].timeWindow * 60 * 1000;
      promises.push(currentModel.updateOne(
        { componentId, bucketStartAt: { $gte: bucketStartAt, $lte: max } },
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
    const promises = [];

    const dataEntry = {
      componentId: componentData.artifactId,
      componentName: componentData.name,
      owners: componentData.owners,
      status: (componentData.active) ? 'active' : 'inactive',
      // statusChangedAt: Date.now(),
      createdAt: Date.now(),
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i].model;
      const bucketStartAt = decideBucket(dataEntry.createdAt, models[i].timeWindow);
      dataEntry.bucketStartAt = bucketStartAt;
      const max = bucketStartAt + models[i].timeWindow * 60 * 1000;
      promises.push(currentModel.updateOne(
        { componentId: componentData.artifactId, bucketStartAt: { $gte: bucketStartAt, $lte: max } },
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
      steps,
    };

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i].model;
      const bucketStartAt = decideBucket(Date.now(), models[i].timeWindow);
      dataEntry.bucketStartAt = bucketStartAt;
      const max = bucketStartAt + models[i].timeWindow * 60 * 1000;
      promises.push(currentModel.updateOne(
        { flowTemplateId: templateData.id, bucketStartAt: { $gte: bucketStartAt, $lte: max } },
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

// Updates user stats across the timeline
const updateUserStats = async (stats) => {
  try {
    const models = modelCreator.getModelsByType('userStats');
    const now = new Date();
    const promises = [];

    for (let i = 0; i < models.length; i += 1) {
      const currentModel = models[i].model;
      const bucketStartAt = decideBucket(now, models[i].timeWindow);
      const before = bucketStartAt - models[i].timeWindow;

      const currentObject = await currentModel.findOne({ bucketStartAt: { $lte: now, $gte: before } }).lean();

      if (!currentObject) {
        const newStats = {
          recentlyActive: stats.recentlyActive,
          inactive: stats.inactive,
          total: stats.total,
          bucketStartAt,
        };
        promises.push(new currentModel(newStats).save());
      } else {
        // TODO: Use some sort of weighted average for better accuracy
        const averageActive = Math.round((stats.recentlyActive + currentObject.recentlyActive) / 2);
        const averageInactive = Math.round((stats.inactive + currentObject.inactive) / 2);
        const averageTotal = Math.round((stats.total + currentObject.total) / 2);

        promises.push(currentModel.updateOne({ _id: currentObject._id }, { active: averageActive, inactive: averageInactive, total: averageTotal }));
      }
    }

    await Promise.all(promises);
    return true;
  } catch (e) {
    log.error(e);
    log.error(e);
    return false;
  }
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

  updateUserStats,
};
