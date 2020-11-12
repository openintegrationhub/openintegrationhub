![alpha](https://img.shields.io/badge/Status-Alpha-yellowgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Template Repository

The Template Repository stores, retrieves and updates flow teamplates in the Open Integration Hub.

All connected solutions to the Open Integration Hub and the work they are doing there are represented by an "integration flow". A data modification in one of the affected systems should propagate to all connected solutions / systems as defined in the corresponding integration flow. A Flow Template is a reusable flow object, with additional convenience functions to help reproduce frequently-used flows for different users. The structure of a template closely tracks that of a flow. By providing a separate endpoint, flows can be shared without users needing permission to each other's flow objects.

## Technical description

This repository is designed to use MongoDB for archiving the integration flows. You will need a MongoDB
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

The Template Repository makes use of the IAM permission system, and requires appropriate permissions for all flow operations. The three used permissions are:

- `templates.read` for getting templates. This applies to the end points GET `/templates` and GET `/templates/{id}`
- `templates.write` for creating, updating, or deleting templates. This applies to the end points POST `/templates`, PATCH `/templates/{id}`, and DELETE `/templates/{id}`
- `flows.write` for generating Flows from a flow teamplate. This applies to end point POST `/templates/{id}/generate`

So in order to carry out template operations, the current user taking them needs to either:

- Have the `ADMIN` role
- Have the `SERVICE_ACCOUNT` role with the necessary permissions assigned to it directly, or
- Have the necessary permissions assigned to their current context.

## REST-API documentation

Visit http://template-repository.openintegrationhub.com/api-docs/ to view the Swagger API-Documentation
