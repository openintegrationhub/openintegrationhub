/* eslint no-param-reassign: "off" */

// const jwt = require('jsonwebtoken')

/**
 * Copyright 2020 Basaas GmbH
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

const { getSnapshotDataForFlow } = require('../utils/helpers')
const { LogicGateway } = require('../main/LogicGate')

/**
 * This method will be called from OIH platform upon receiving data
 *
 * @param {Object} msg - incoming message object that contains keys `data` and `metadata`
 * @param {Object} cfg - configuration that contains login information and configuration field values
 * @param {Object} snapshot - current step snapshot data
 * @param {Object} incomingMessageHeaders - contains transformed incoming message headers
 * @param {Object} tokenData - parsed orchestrator token data
 */

async function processAction(
  msg,
  cfg,
  snapshot,
  incomingMessageHeaders,
  tokenData
) {
  try {
    const { rule } = cfg

    const { apiKey, flowId } = tokenData

    const snapshotData = await getSnapshotDataForFlow({
      flowId,
      iamToken: apiKey,
      flowExecId: tokenData.flowExecId,
    })

    if (cfg.nodeSettings.devMode) {
      console.log('snapshotData', snapshotData)
    }

    const logicGateway = new LogicGateway({
      rule,
      snapshotData,
    })
    const logicResponse = logicGateway.process()

    console.log('logicResponse', logicResponse)

    if (logicResponse && logicResponse.command) {
      this.emit('data', logicResponse)
    }

    console.log('Finished execution')
    this.emit('end')
  } catch (e) {
    console.log(`ERROR: ${e}`)
    this.emit('error', e)
  }
}

module.exports = {
  process: processAction,
}
