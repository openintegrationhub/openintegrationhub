# Status
accepted

# Context
Which architecture pattern do we use for the OIH?

# Alternatives

## Alternative Microservice architecture

### Decision
Microservice architecture is accepted.
To avoid too many different frameworks and products. A list of recommended products, technologies and frameworks will be created.
On database level, some concessions can be made to reduce the amount of database instances. A strict separation between different microservices within the same database instance is mandatory.

### Consequences
Pros:
- High autonomy of services (implementation choices, independent development and life cycle)
- Easy to scale independent services
- Good reuse of components

Cons:
- Development and Test overhead due to inter service communication and separate environments
- Data redundance due because each service has its own data storage
- Harder to monitor

## Alternative Service oriented architecture

### Decision
The decision was made in favor of the microservice architecture.

### Consequences
Pros:
- Good reuse of components

Cons:
- Architecture definition is less concrete than microservices architecture
