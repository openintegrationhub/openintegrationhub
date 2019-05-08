# Status
accepted

# Context
The OIH API is the interface provided by the OIH which is used by the connectors to exchange data with the OIH.

requirements for the OIH API:
- open source based
- catchy (well documented, intuitive, easy accessible and plausible)
- supports bidirectional communication
- supports a synchron request/reply interaction style

brainstorming regarding protocols and technology:
- http://www.odata.org/
- https://en.wikipedia.org/wiki/HATEOAS
- https://swagger.io/


# Alternatives

## Alternative messaging based with json markup and optional wrapper apis 
The main oih api will be implemented using asynchron messaging.
Additional apis can be implemented as wrapper apis which provides additional interfaces e.g. rest/json and uses the main api.

### Decision
the decision was made in favor of rest/json

### Consequences
Request/reply scenarios must be implemented using reply queues.
Scalability is achieved using a scalable messaging infrastructure.
One to many communication is supported.


## Alternative rest/json
The main oih api will be implemented using json/rest.

### Decision
decided on this alternative

### Consequences
The synchron api request/response cycle must be managed (e.g. http polling, callbacks) to reduce the impact on the scalability and performance of the system.
One to many communication is not supported.
Scalability is achieved using a load balancing infrastructure component like Kubernetes routing.


## Alternative sdk
The API will be implemented as a standard development kit (sdk). The technical details regarding protocol and frameworks are encapsulated in the sdk. The sdk must be well documented.

### Decision
the decision was made in favor of rest/json

### Consequences
Pros:
- technical details like protocol and frameworks can be changed with minor impact to the clients

Cons:
- swagger is not compatible with a sdk
- clients must use the provided sdk

