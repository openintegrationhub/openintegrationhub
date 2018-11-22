<p align="center">
  <img src="https://github.com/openintegrationhub/Microservices/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Integration Content Repository (working title / Codename Bragi)

Bragi stores, retrieves and updates the integration flows of the Open Integration Hub.

All connected solutions to the Open Integration Hub and the work they are doing there are represented by an "integration flow". A data modification in one of the affected systems should propagate to all connected solutions / systems as defined in the corresponding integration flow.

The integration flows are defined by a single user of the Open Integration Hub or a member of an organization which uses the Open Integration Hub.

The flows are specified in JSON, therefore we store and retrieve them in JSON.

## Technical description
Bragi uses MongoDB for archiving the integration flows. You will need a MongoDB
and change the path in the deployment.yaml. We use Mongoose for object modeling. Mongoose is built on top of the official MongoDB Node.js driver.

For documenting the API Bragi uses the SwaggerUI.

Authentification is done with the OIH-IAM. Please change the iam url inside the
deployment.yaml.


## REST-API documentation

Visit http://localhost:3001/docs to view the Swagger API-Documentation

## Current status
This is only a early release to show the functionality of a content repository. The definition of a flow is still a draft.
