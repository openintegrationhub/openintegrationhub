![beta](https://img.shields.io/badge/Status-Beta-yellow.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Analytics Service

The Analytics Service serves as the central repository for all data analytics-related data and functions inside the OIH. It offers both a database for long-term storage of relevant data as well as an API for data retrieval and validation.

## Functions

The basic concept of the analytics service is based on configurable time windows to persist data that is either gathered at set intervals or pushed through certain events. The service can then retrieve this data based on a specified time window and granularity. Data is persisted for a configurable period of time and automatically deleted thereafter. For example, this can allow for storing short-term granular data in 15-minute windows for a few days, while also retaining less granular averaged data of 30-day windows for several years.

### Types of stored data
Currently the following types of data are gathered and persisted: 

- FlowData: High-level information about the total number of flows, and how many of these are active.
- UserData: High-level information about the total number of users, and how many have been recently active or long-term inactive
- Flows: Low-level granular information about usage of individual flows and any errors that may have occurred within them
- Components: Low-level granular information about individual components, such as activity state and usage by flows
- FlowTemplates: Low-level granular information about flow templates, such as usage by flows

### Configuration

The granularity and storage duration of data can be freely configured by adjusting the values in the config/index file. The relevant properties are:

- timeWindows: Determines the granularity of time windows in which data is stored. Defaults to windows of 15 minutes, 1 hour, 1 day, and 30 days. The property name can be arbitrary, the value determines the duration of the time window in minutes.

- storageWindows: Determines for how long each time window is stored. Property names must match those defined in timeWindows, value is the storage duration in minutes.

- pollingCron: A cron expression determining how often analytics data is fetched. For best results, it should be set so that it polls at least once during the shortest configured timeWindow. If data is polled several times during a given time window, it is averaged with existing values.

## Local installation/development

### Without Docker

- Ensure a local MongoDB Database is running
- Run `npm install` to install dependencies. If dependencies are still reported missing, run `npm install` within the /app/iam-utils/ folder as well
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`

## REST-API documentation

Visit http://analytics-service.openintegrationhub.com/api-docs/ to view the Swagger API-Documentation
