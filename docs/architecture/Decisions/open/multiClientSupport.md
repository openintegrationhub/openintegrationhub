# Status
proposed

# Context
An ISV application contains multiple client accounts. Do the OIH connector components support multiple clients in the same runtime?

# Alternatives

## Alternative multiple clients supported
The connector components supports multiple clients. During configuration of the integration flow configuration options can be used to either use a dedicated connector component or use a shared connector component.

### Decision
no decision yet

### Consequences
* It must be ensured that messages from different clients are not mixed.
* The API of the ISV application must support connections for multiple clients per connection.
* API keys and tokens for the the flows must be added during runtime in a secure way. 
* An uncaught runtime error might crash all other flows.
* Additional events must be defined for each flow startup and teardown, e.g. return current state to user; precise ressource billing, etc.
* For horizontal scaling, a sophisticated mechanism is required to detect ressource usage and potentially spawning of new containers if the vertical limit of a connector is reached.

## Alternative one connector for each client
The connector components does not support multiple clients. 

### Decision
no decision yet

### Consequences
For each client a dedicated runtime environment must be started. If there are a lot of clients in an ISV application, this leads to a significant amount of runtime components and corresponding high ressource costs.
