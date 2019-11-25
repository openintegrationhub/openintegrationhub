![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Logging service

Provides an API to get flow execution logs. Reference implementation works with the Google Cloud Logging API.

## API docs
The service has an API, which is accessible only inside the cluster.

### Get logs of one flow step
**GET /logs/flows/{FLOW_ID}/steps/{STEP_ID}**

**URL parameters**

| Name | Required | Description |
| --- | --- | --- |
| FLOW_ID | yes | The Flow ID |
| STEP_ID | yes | The flow step's ID |


**Query params**

| Name | Required | Description |
| --- | --- | --- |
| pageSize | no | Number of log items to retrieve. Default: 1000. |
| pageToken | no | Token of a page to retrieve. |

 
**Response body**
 
```json
{
  "data": [
    {
      "timestamp": "2019-11-08T11:53:17.497Z",
      "message": "can be a string or an object (if a component logs in JSON format)"
    }
  ],
  "meta": {
    "pageSize": "1000",
    "nextPageToken": "long string or null, if there are no more pages"
  }
}
```

## Prerequisites

- Flow execution logs should be accessible through the Google Cloud Logging API.
- Service Account with corresponding permissions.

## Service Account

This service requires a service account with the following permissions:

- `iam.token.introspect`

## How to build

```docker
docker build -t openintegrationhub/logging-service-:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

## Environment variables

### General

| Name | Description |
| --- | --- |
| GOOGLE_APPLICATION_CREDENTIALS | Path to the [gcloud credentials file](https://cloud.google.com/docs/authentication/getting-started). |
| IAM_TOKEN | Token of the service account. |
| LOG_LEVEL | Log level for logger. |
| PORT | Port for HTTP interface. |
