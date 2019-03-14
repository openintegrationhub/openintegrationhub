# Status
proposed

# Context
A connector is a logical coherent unit consisting of an adapter and a transformer. For definition of an adapter see the [adapter concept](https://github.com/openintegrationhub/Connectors/tree/master/Adapters#adapter-concept).
This architecure decision covers the transformer functionalities and reveals two options.



# Alternatives

## Mapper
A transformer only covers mapping of different entities of two data models.
This includes the mapping of the structure of the incoming object onto the stucture of the target object (e.g. via a transformation language such as JSONata).
Additional functionality such as aggregation of different objects to match the structure of the target object is not included.

### Decision
No decision yet

### Consequences


## Aggregator
A transformer covers mapping functionalities and further aggregates multiple incoming objects. This includes waiting for missing objects ... (further functionality tbd)

### Decision
No decision yet

### Consequences
