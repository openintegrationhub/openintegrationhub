# Message Format
The audit log service should mainly point into:

- tracking of user activity
- user interaction with components and API functionality
- administrative actions (like create a tenant, add user)

Therefore we need a message format for every service. We suggest the following
message format:

## Old
```json
{
  "serviceName": "string",
  "timeStamp": "string",
  "instanceName": "string",
  "tenantId": "string",
  "eventLevel": {
    "type": "string",
    "enum": ["info", "error", "warning", "debug"],
    "description": "different types of event levels"
  },
  "dto": {
    "eventName": "string",
    "userId": "string",
    "tenantId": "string",
    "messageCount": "string",
    "object": "string",
    "actionName": "string",
    "status": "string",
    "description": "string"
  }
}
```
## new

```json
{
  "service": "string",
  "timeStamp": "string",
  "nameSpace": "string",
  "payload": {
    "tenant": "string",
    "source": "string",
    "object" : "string",
    "action": "string",
    "subject": "string",
    "details": "string"
  }
}
```


## Description

The first part is consistent across every oih service.

serviceName is the specific name of the service, each service provides its own name.

timeStamp should be consistent across all services. It should be ISO 8601 complaint, like ```2019-01-31T18:25:43.511Z```.

The value for instanceName is the specific PodId from the Kubernetes Cluster.

The eventLevel is a suggestion and should be further defined. It should describe
the different kind of events, so we can filter it later.

The dto (payload with the specific event message) is individual for each service.
Here we see the message we would like to store in the audit log service.

The API of the service provides filtering of the object fields. Therefore the
dto-fields must be included. Custom fields can be added individually by each service.

The value in messageCount is a message counter for every service, so we can sort the message from each service and can be sure, that they are in a chronological order.

In the description we can store the specific message informations.

## Examples

### 1 Add a flow to the Integration Content Repository
```json
{
  "serviceName": "icr",
  "timeStamp": "2019-01-31T18:25:43.511Z",
  "instanceName": "1230815",
  "tenantId": "uid345",
  "eventLevel": "info",
  "dto": {
    "eventName": "flowAdded",
    "userId": "uid123",
    "tenantId": "uid0815",
    "messageCount": "123",
    "object": "flow",
    "actionName": "addFlow",
    "status": "successful",
    "description": "User added Flow uid4711"
  }
}
```

### 2 Delete a flow from the Integration Content Repository
```json
{
  "serviceName": "icr",
  "timeStamp": "2019-01-31T18:26:43.511Z",
  "instanceName": "1230815",
  "tenantId": "uid345",
  "eventLevel": "info",
  "dto": {
    "eventName": "flowDeleted",
    "userId": "uid123",
    "tenantId": "uid0815",
    "messageCount": "124",
    "object": "flow",
    "actionName": "deleteFlow",
    "status": "successful",
    "description": "User deleted Flow uid4711"
  }
}
```

### 3 Tried to update a deleted flow from the Integration Content Repository
```json
{
  "serviceName": "icr",
  "timeStamp": "2019-01-31T18:27:43.511Z",
  "instanceName": "1230815",
  "tenantId": "uid345",
  "eventLevel": "error",
  "dto": {
    "eventName": "flowUpdated",
    "userId": "uid123",
    "tenantId": "uid0815",
    "messageCount": "125",
    "object": "flow",
    "actionName": "updatedFlow",
    "status": "failed",
    "description": "Flow not found with uid4711"
  }
}
```
