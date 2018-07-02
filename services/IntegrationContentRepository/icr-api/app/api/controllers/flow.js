'use strict'
const path = require('path');
const _ = require('lodash');

// require our MongoDB-Model
const Flow = require('../../models/flow');

const getFlows = (req, res) => {
  Flow.find({})
  .then(doc => {
    if(doc == '') {
      res.status(404).send('No flows found');
    }
    else {
      res.json(doc);
    }
  })
  .catch(err => {
    console.error(err)
  });
};

const addFlow = (req, res) => {
    //convention: params.[parameterName].value
    const newFlow = req.swagger.params.body.value;

    let storeFlow = new Flow({
      type: newFlow.type,
      oihid: newFlow.oihid,
      attributes: {
        name: newFlow.name,
        status: newFlow.status,
        current_status: newFlow.current_status,
        default_mapper_type: newFlow.default_mapper_type,
        description: newFlow.description
      }
    });

    storeFlow.save()
      .then(doc => {
        res.json(doc);
      })
      .catch(err => {
        console.error(err)
      });
};

const updateFlow = (req, res) => {
  const updateFlow = req.swagger.params.body.value;

  let storeFlow = {
    type: updateFlow.type,
    oihid: updateFlow.oihid,
    attributes: {
      name: updateFlow.name,
      status: updateFlow.status,
      current_status: updateFlow.current_status,
      default_mapper_type: updateFlow.default_mapper_type,
      description: updateFlow.description
    }
  };

  Flow.findOneAndUpdate({oihid: updateFlow.oihid}, storeFlow,
    {upsert: false, new: true})
    .then(doc => {
      if(!doc) {
        res.status(404).send('Flow not found');
      }
      else {
        res.json(doc);
      }
    })
    .catch(err => {
      console.error(err)
    });
};

const getFlowById = (req, res) => {
  const flowId = req.swagger.params.oihid.value;
  Flow.find({oihid: flowId})
    .then( doc => {
      console.log(doc);
      if(doc != "") {
        res.json(doc);
      }
      else {
        res.status(404).send('Flow not found');

      }
  })
  .catch(err => {
    console.error(err)
  });
};

const updateFlowWithForm = (req, res) => {
  const flowId = req.swagger.params.oihid.value;
  const updateFlow = {
    oihid: req.swagger.params.flow.value,
    attributes: {
      name: req.swagger.params.name.value,
      status: req.swagger.params.status.value,
      current_status: req.swagger.params.current_status.value
    }
  };
  Flow.findOneAndUpdate({oihid: flowId}, updateFlow,
    {upsert: false, new: true})
    .then(doc => {
      if(!doc) {
        res.status(404).send('Flow not found');
      }
      else {
        res.json(doc);
      }
    })
    .catch(err => {
      console.error(err)
    });
};

const deleteFlow = (req, res) => {
  const flowId = req.swagger.params.oihid.value;
  Flow.findOneAndRemove({
    oihid: flowId
  })
  .then(response => {
    if(!response) {
      res.status(404).send('Flow not found');
    }
    else {
      res.json(response);
    }
  })
  .catch(err => {
    console.error(err)
  });
};

module.exports = {
    getFlows,
    addFlow,
    updateFlow,
    getFlowById,
    updateFlowWithForm,
    deleteFlow
};
