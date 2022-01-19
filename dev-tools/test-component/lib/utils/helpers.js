const request = require('request-promise').defaults({
  simple: false,
  resolveWithFullResponse: true,
})

function getSnapshotsApiEndpoint() {
  return (
    process.env.ELASTICIO_SNAPSHOTS_SERVICE_BASE_URL ||
    'https://snapshots.openintegrationhub.com'
  )
}

async function getSnapshotDataForFlow({ flowId, flowExecId, iamToken }) {
  try {
    const response = await request({
      method: 'GET',
      uri: `${getSnapshotsApiEndpoint()}/snapshots/flows/${flowId}/steps${
        flowExecId ? `?flowExecId=${flowExecId}` : ''
      }`,
      json: true,
      headers: {
        Authorization: `Bearer ${iamToken}`,
      },
    })

    return response.body.data
  } catch (e) {
    console.error(e)
    return { exists: false }
  }
}

module.exports = {
  getSnapshotDataForFlow,
  getSnapshotsApiEndpoint,
}
