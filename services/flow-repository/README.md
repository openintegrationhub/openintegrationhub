<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Flow Repository (working title / Codename Bragi)

Bragi stores, retrieves and updates the integration flows of the Open Integration Hub.

All connected solutions to the Open Integration Hub and the work they are doing there are represented by an "integration flow". A data modification in one of the affected systems should propagate to all connected solutions / systems as defined in the corresponding integration flow.

The integration flows are defined by a single user of the Open Integration Hub or a member of an organization which uses the Open Integration Hub.

The flows are specified in JSON, therefore we store and retrieve them in JSON.

## Technical description
Bragi uses MongoDB for archiving the integration flows. You will need a MongoDB
and change the path in the deployment.yaml. We use Mongoose for object modeling. Mongoose is built on top of the official MongoDB Node.js driver.

For documenting the API Bragi uses the SwaggerUI.

## Local installation/development

### Without Docker:
- Ensure a local MongoDB Database is running
- Run `npm install` to install dependencies. If dependencies are still reported missing, run `npm install` within the /app/iam-utils/ folder as well
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`

### With Docker:
- Ensure a local MongoDB Database is running
- Build (with `docker build . -t [IMAGENAME]`) or download the docker image
- Run the image with `docker run --network="host" [IMAGENAME]`
- If using the IAM middleware/features, set the environment variables to match those used by your IAM instance by using the `-e` option for `docker run`. For example: `docker run -e "INTROSPECT_ENDPOINT_BASIC=http://localhost:3099/api/v1/tokens/introspect" -t --network="host" [IMAGENAME]`

### Use of experimental IAM permission system.
By default, the ICR derives read and write permissions implicitly from the user's tenant roles, as defined in the config. However, it can also make use of the IAM's permission system, allowing for a finer control of each user's permissions. To use this system instead of the default role-based one, set the environment variable USE_PERMISSIONS to true. Make certain that your user object has the "permission" arrays according to the latest IAM data model, and that they are endowed with the necessary permissions as defined in the ICR config.

## REST-API documentation

Visit http://localhost:3001/docs to view the Swagger API-Documentation

## Current status
This is only a early release to show the functionality of a content repository. The definition of a flow is still a draft.
