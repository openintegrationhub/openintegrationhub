![alpha](https://img.shields.io/badge/Status-Alpha-yellow.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Governance Service (working title / Codename Thoth)

The Governance Service serves as the central repository for all data governance-related data and functions inside the OIH. It offers both a database for long-term storage of relevant data as well as an API for data retrieval and validation.

## Functions

### Data Provenance

The "Data Provenance" function of the Governance Repository is intended to allow users to reconstruct their data's path through the OIH from the very first time it was synchronized up until the current moment. This way, the data owner will be able to track all origins and destinations of their data, and whether it has been modified inside the OIH. This way, the data owner will be made more capable of complying with data governance policies and laws, such as the GDPR.

To this end, the Governance Service is capable of receiving metadata about certain events, such as a data object being transmitted from one application to another, and stores it as a detailed data provenance event. These events can then be retrieved, filtered, and searched using the Service's API.

#### Provenance data model

The used data model is based on [PROV-DM](https://www.w3.org/TR/prov-dm/). This allows for easy mapping and export of provenance data to other systems. The model describes tuples of entities, agents, and activities, in addition to optional situational fields, such as describing one agent acting on behalf of another.

Example provenance object:

```json
{
  "entity": {
    "id": "aoveu03dv921dvo",
    "entityType": "oihUid"
  },
  "activity": {
    "activityType": "ObjectReceived",
    "used": "getPersons",
    "startedAtTime": "2020-10-19T09:47:11+00:00",
    "endedAtTime": "2020-10-19T09:47:15+00:00"
  },
  "agent": {
    "id": "w4298jb9q74z4dmjuo",
    "agentType": "Component",
    "name": "Google Connector"
  },
  "actedOnBehalfOf": [
    {
      "first": true,
      "id": "w4298jb9q74z4dmjuo",
      "agentType": "Component",
      "actedOnBehalfOf": "j460ge49qh3rusfuoh"
    },
    {
      "id": "j460ge49qh3rusfuoh",
      "agentType": "User",
      "actedOnBehalfOf": "t454rt565zz57"
    },
    {
      "id": "t454rt565zz57",
      "agentType": "Tenant"
    }
  ]
}
```


### Smart Rules

The Smart Rules framework allows objects to be checked against predefined policies. The governance service will then return a response indicating whether the object fulfills this policy for a given purpose. Additionally, it may return a modified version of the object in order to ensure policy adherence. This allows a user to configure flows that will only synchronise objects that pass certain conditions, or that should be automatically modified in some fashion before being passed on.

#### Policy Data model

The data model used to represent policies is based on a simplified version of the [ODRL-model](https://www.w3.org/TR/odrl-model/). This allows it to model a large variety of possible use-cases, and to easily be transformed to and from other policy models. A user can define both permissions and duties, each of which can be further clarified with constraints. A permission must be present and its constraints fulfilled in order for the governance-service to allow the flow to proceed. A duty indicates an automated function that the governance service is expected to execute before returning a response.

A minimal example:

```json
 {
   "permission": [{
     "action": "distribute",
     "constraint": {
       "leftOperand": "categories.label",
       "operator": "equals",
       "rightOperand": "Customer"
       },
     }]
 {
```

The meaning of the keys are:

- `action`: A string referring to which action this permission allows. When checking a policy, the user can determine in which action this policy should be checked against. If no permission matching the selected action can be found, a negative response is returned.

- `constraint`: Constraints are used to more precisely specify a permission or duty. Each constraint consists of a left and right operand, which are compared against each other based on a specified operator.

- `leftOperand`, `rightOperand`: Specifies the values that should be compared against each other. The specific format of the operands depends on the chosen operator. They may specify a certain value, or refer to a key within the flow object.

- `operator`: Refers to a particular predefined comparator function stored within the governance service. Upon checking the constraint, this function will be called with both operands as arguments, and return either `true` or `false` depending on whether the constraint is fulfilled.

As such, the example above expresses this: The flow object may only be distributed if it has a property called `categories`, and within that property there is a property `label` that exactly equals "Customer".

## Technical description

Thoth uses MongoDB for archiving the integration flows. You will need a MongoDB
and change the path in the deployment.yaml. We use Mongoose for object modeling. Mongoose is built on top of the official MongoDB Node.js driver.

For documenting the API Thoth uses the SwaggerUI.

## Local installation/development

### Without Docker

- Ensure a local MongoDB Database is running
- Run `npm install` to install dependencies. If dependencies are still reported missing, run `npm install` within the /app/iam-utils/ folder as well
- If using the IAM middleware/features, set the environment variable `INTROSPECT_ENDPOINT_BASIC` to match the respective endpoint used by your used IAM instance.
- Run `npm start`

## REST-API documentation

Visit http://governance-service.openintegrationhub.com/api-docs/ to view the Swagger API-Documentation
