<p align="center">
  <img src="https://github.com/openintegrationhub/Microservices/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Audit Log

The OIH Audit Log serves to receive, store, and return logging information about important user actions and system events. Other OIH Microservices can generate audit messages and pass them on to the Audit Log via the message and event bus or a simple HTTP POST request.

Stored Logs can be retrieved by authorized users through a simple REST API. The Audit Log offers several functions to filter and search through the accumulated logs.

## Technical description
The Audit Log receives messages either via POST or by publishing them to the appropriate RabbitMQ exchange and topic, using the OIH Event Bus. Received logs will be stored in MongoDB instance. Retrieving logs can be done via a single GET endpoint with a variety of filters and options. See the provided Swagger-documentation for further information.

Incoming message payload is expected to adhere to the specified OIH message format:
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

Messages will be validated against this format, and only stored if they are valid. Messages with an invalid format will be rejected.

## Local installation/development

### Without Docker:
- Ensure that both a local MongoDB Database and RabbitMQ instance are running
- Run `npm install` to install dependencies.
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`
- To simplify publishing events to your local queue to be read by the Audit Log, you can use the provided file `/test/utils/generate-events.js`

### With Docker:
- Ensure a local MongoDB Database is running
- Build (with `docker build . -t [IMAGENAME]`) or download the docker image
- Run the image with `docker run --network="host" [IMAGENAME]`
- If using the IAM middleware/features, set the environment variables to match those used by your IAM instance by using the `-e` option for `docker run`. For example: `docker run -e "INTROSPECT_ENDPOINT_BASIC=http://localhost:3099/api/v1/tokens/introspect" -t --network="host" [IMAGENAME]`

The folder `examples` contains an example script that will publish a log event to a local RabbitMQ server, where a local instance of the Audit Log should be able to receive it.

## REST-API documentation

Visit http://localhost:3007/docs to view the Swagger API-Documentation

## Current status
This is a prototypical implementation to demonstrate basic functionality.
