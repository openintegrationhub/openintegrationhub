![alpha](https://img.shields.io/badge/Status-Alpha-yellow.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Analytics Service (working title)

The Analytics Service serves as the central repository for all data analytics-related data and functions inside the OIH. It offers both a database for long-term storage of relevant data as well as an API for data retrieval and validation.

## Functions


For documenting the API it uses the SwaggerUI.

## Local installation/development

### Without Docker

- Ensure a local MongoDB Database is running
- Run `npm install` to install dependencies. If dependencies are still reported missing, run `npm install` within the /app/iam-utils/ folder as well
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`

## REST-API documentation

Visit http://analytics-service.openintegrationhub.com/api-docs/ to view the Swagger API-Documentation
