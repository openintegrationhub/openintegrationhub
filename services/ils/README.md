<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Integration Layer Service (ILS)
The basic purpose of the ILS is to receive data objects from one or several incoming flows, apply some business logic on them (such as a merge or split), validate them against a supplied schema, and then provide the resulting valid objects as input to other flows. For this purpose, the ILS is capable of temporarily storing these objects in a database until they are no longer required.

Objects can be posted to the ILS through a simple REST-API, and retrieved the same way. The ILS will only deliver objects that have been successfully validated against the supplied definition. This communication should generally be conducted through the Integration Layer Adapter.

## Use case: Merging objects
For the current prototypical implementation, the chosen core functionality is the merging of incomplete objects from separate sources until all required data has been added. For this purpose, all incoming POST requests must supply a *common identifier* (`cid`) by which incoming objects can be matched against each other. Each time a new object comes in, the ILS first looks up its database to check whether another object with a matching `cid` is already stored. If one is found, the new data is merged into the existing object. If not, the incoming object is saved as-is.

In either case, the resulting object is then validated against a supplied definition, which includes a list of required fields. A valid object will be marked as such, and can then be retrieved by another component. If an object is invalid, it cannot be retrieved, and will instead be stored until the necessary data has been merged into it and it passes validation.

## Use case: Splitting objects
ILS comes into play when the user would like to split an object into smaller or other objects containing properties from the main object. Let's say that the user want to split the object containing employee's `firstName`, `lastName`, `salutation`, `organization`, `email`, `street` and `streetNumber` into two separate objects. The first one should have the properties `firstName`, `lastName`  and `salutation` ant the second one should contain the rest. In this case the user must provide `splitSchema` array containing two objects and each of them must have the properties `meta` and `payload`. Meta has the special property `splitKey` which servers as an identifier and `payload` consists of the fields which the new splitted object must contain. After successful splitting each new object should hold  the `splitKey` and `payload` properties.

On the other hand the user would like to `GET` a new/splitted object. In such a case an `ilaId` and a `splitKey` must be provided. Then ILS will return an array of all objects which have the same `splitKey`.


## Technical description

The ILS API currently supports the following endpoints:  

`POST /chunks` -  Create a new chunk object  
`POST /chunks/validate` - Validate an incoming object from SDF  
`POST /chunks/split` - Split a chunk into objects  
`GET /chunks/${ilaId}?key=${splitKey}` - fetch chunks by `ilaId` and `splitKey`. SplitKey is on optional parameter for fetching chunks which are splitted by the same `splitSchema`

These operations ought to be conducted via the ILA, but can also be targeted manually for testing and development purposes.

For `POST /chunks`, the body format is expected to match this format:
```json
{
  "ilaId": "string",
  "token": "string",
  "cid": "string",
  "def": {
    "domainId": "string",
    "schemaUri": "string"
  },
  "payload": {}
}
```

- `ilaId`: Identifies which combination of flows this object belongs to. Must match among all connected flows.
- `token`: IAM token which is required for fetching a schema from Meta Data Repository
- `cid`: A *common identifier* designating which fields are used to match objects to one another. Must be a key within the supplied payload
- `def`: The definition against which objects are validated. Currently expected to be a JSON schema or a schema from Meta Data Repository .
- `domainId`: Id of the domain in Meta Data Repository
- `schemaUri`: Schema URI or schema name from Meta Data Repository
- `payload`: The actual data object, in JSON format.

For `POST /chunks/validate`, the body format is expected to match this format:
```json
{
  "ilaId": "string",
  "token": "string",
  "cid": "string",
  "def": {
    "domainId": "string",
    "schemaUri": "string"
  },
  "payload": {}
}
```

- `ilaId`: Identifies which combination of flows this object belongs to. Must match among all connected flows.
- `token`: IAM token which is required for fetching a schema from Meta Data Repository
- `cid`: A *common identifier* designating which fields are used to match objects to one another. Must be a key within the supplied payload
- `def`: The definition against which objects are validated. Currently expected to be a JSON schema or a schema from Meta Data Repository .
- `domainId`: Id of the domain in Meta Data Repository
- `schemaUri`: Schema URI or schema name from Meta Data Repository
- `payload`: The actual data object, in JSON format.

For `POST /chunks/split`, the body format should have the following format:
```json
{
  "ilaId": "string",
  "payload": {},
  "splitSchema": [
    {
      "meta": {
        "splitKey": "string"
      },
      "payload": {}
    }
  ]
}
```

- `ilaId`: Identifies which combination of flows this object belongs to. Must match among all connected flows.
- `payload`: The actual data object, in JSON format.
- `splitSchema`: A schema object which could contain more then one schema. The main purpose is each schema has a meta object with an unique `splitKey`. This identifies the splitting model. In `payload` is the actual schema with all properties.

To `GET /chunks/${ilaId}`, an `ilaId` must be supplied. This will return all objects marked as valid that have been saved with this `ilaId`.

To `GET /chunks/${ilaId}?key=${splitKey}` the user should provide the `ilaId` and `key` as a parameter for fetching objects which are splitted by a `splitSchema` with the certain `splitKey`.

For storage, the ILS uses MongoDB. Stored objects are endowed with a Time To Live of one hour, which is refreshed every time new data is merged into them.


## Integration Layer Adapter (ILA)
The ILA is a generic component used to allow flows to communicate with the ILS. In posting mode, it automatically passes on any data objects received by other flow components, and endows them with the metadata listed above. In polling mode, it will automatically fetch all valid combined objects and pass them on to other components just like any other flow component. For further information about the ILA, see its [GitHub Repository](https://github.com/openintegrationhub/integration-layer-adapter)

## Local installation/development
To install the necessary dependencies, first run `npm install`. The service can then be started via `npm start`, and is reachable on http://localhost:3003.

## REST-API documentation

Visit http://localhost:3003/api-docs to view the Swagger API-Documentation
