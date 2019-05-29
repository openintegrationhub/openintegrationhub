<p align="center">
  <img src="https://github.com/openintegrationhub/Microservices/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Integration Layer Service (ILS)
The basic purpose of the ILS is to receive data objects from one or several incoming flows, apply some business logic on them (such as a merge or split), validate them against a supplied schema, and then provide the resulting valid objects as input to other flows. For this purpose, the ILS is capable of temporarily storing these objects in a database until they are no longer required.

Objects can be posted to the ILS through a simple REST-API, and retrieved the same way. The ILS will only deliver objects that have been successfully validated against the supplied definition. This communication should generally be conducted through the Integration Layer Adapter.

## Use case: Merging objects
For the current prototypical implementation, the chosen core functionality is the merging of incomplete objects from separate sources until all required data has been added. For this purpose, all incoming POST requests must supply a *common identifier* (cid) by which incoming objects can be matched against each other. Each time a new object comes in, the ILS first looks up its database to check whether another object with a matching cid is already stored. If one is found, the new data is merged into the existing object. If not, the incoming object is saved as-is.

In either case, the resulting object is then validated against a supplied definition, which includes a list of required fields. A valid object will be marked as such, and can then be retrieved by another component. If an object is invalid, it cannot be retrieved, and will instead be stored until the necessary data has been merged into it and it passes validation.

## Technical description
The ILS API currently supports two end points, one for POSTing new objects, and one for GETting valid ones. Both of these operations ought to be conducted via the ILA, but can also be targeted manually for testing and development purposes.

For a POST, the body format is expected to match this format:
```json
{
  "ilaId": "string",
  "cid": "string",
  "def": {},
  "payload": {}
}
```

- `ilaId`: Identifies which combination of flows this object belongs to. Must match among all connected flows.
- `cid`: A *common identifier* designating which fields are used to match objects to one another. Must be a key within the supplied payload
- `def`: The definition against which objects are validated. Currently expected to be a JSON schema.
- `payload`: The actual data object, in JSON format.

To GET, an `ilaId` must be supplied. This will return all objects marked as valid that have been saved with this `ilaId`.

For storage, the ILS uses MongoDB. Stored objects are endowed with a Time To Live of one hour, which is refreshed every time new data is merged into them.


## Integration Layer Adapter (ILA)
The ILA is a generic component used to allow flows to communicate with the ILS. In posting mode, it automatically passes on any data objects received by other flow components, and endows them with the metadata listed above. In polling mode, it will automatically fetch all valid combined objects and pass them on to other components just like any other flow component. For further information about the ILA, see its [GitHub Repository](https://github.com/openintegrationhub/integration-layer-adapter)

## Local installation/development
To install the necessary dependencies, first run `npm install`. The service can then be started via `npm start`, and is reachable on http://localhost:3002.

## REST-API documentation

Visit http://localhost:3002/api-docs to view the Swagger API-Documentation
