![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Flow Repository

The Flow Repository stores, retrieves and updates the integration flows of the Open Integration Hub.

All connected solutions to the Open Integration Hub and the work they are doing there are represented by an "integration flow". A data modification in one of the affected systems should propagate to all connected solutions / systems as defined in the corresponding integration flow.

The integration flows are defined by a single user of the Open Integration Hub or a member of an organization which uses the Open Integration Hub.

The flows are specified in JSON, therefore we store and retrieve them in JSON.

## Technical description

The Flow Repository uses MongoDB for archiving the integration flows. You will need a MongoDB
and change the path in the deployment.yaml. We use Mongoose for object modeling. Mongoose is built on top of the official MongoDB Node.js driver.

SwaggerUI is used to document the API.

## Local installation/development

### Without Docker

- Ensure a local MongoDB Database is running
- Run `npm install` to install dependencies. If dependencies are still reported missing, run `npm install` within the /app/iam-utils/ folder as well
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`

### With Docker

- Ensure a local MongoDB Database is running
- Build (with `docker build . -t [IMAGENAME]`) or download the docker image
- Run the image with `docker run --network="host" [IMAGENAME]`
- If using the IAM middleware/features, set the environment variables to match those used by your IAM instance by using the `-e` option for `docker run`. For example: `docker run -e "INTROSPECT_ENDPOINT_BASIC=http://localhost:3099/api/v1/tokens/introspect" -t --network="host" [IMAGENAME]`

### Use of IAM permissions.

The Flow Repository makes use of the IAM permission system, and requires appropriate permissions for all flow operations. The three used permissions are:

- `flows.read` for getting flows. This applies to the end points GET `/flows` and GET `/flows/{id}`
- `flows.write` for creating, updating, or deleting flows. This applies to the end points POST `/flows`, PATCH `/flows/{id}`, and DELETE `/flows/{id}`
- `flows.control` for starting and stopping flows. This applies to the end points POST `/flows/{id}/start`, and POST `/flows/{id}/stop`

So in order to carry out flow operations, the current user taking them needs to either:

- Have the `ADMIN` role
- Have the `SERVICE_ACCOUNT` role with the necessary permissions assigned to it directly, or
- Have the necessary permissions assigned to their current context.

## REST-API documentation

Visit http://flow-repository.openintegrationhub.com/api-docs/ to view the Swagger API-Documentation
