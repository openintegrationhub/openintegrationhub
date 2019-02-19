
# Status
accepted

# Context
Is the OIH Smart Data Framework neccessary to enable the hub and spoke communication style within the OIH?
https://en.wikipedia.org/wiki/Hub_and_spokes_architecture

# Alternatives

## Alternative 1
The OIH Smart Data Framework is not neccessary to enable the hub and spoke communication style within the OIH.
The OIH Smart Data Framework is an optional component. The basic OIH features like hub and spoke communication style must be usable without the Data Hub.

### Decision
the decision was made in favor of Alternative 2

### Consequences
Transformations involving a central hub might be more complex. The master data model must be compatible with the application specific data model.

## Alternative 2
The OIH Smart Data Framework is neccessary to enable the hub and spoke communication style within the OIH.

### Decision
the decision was made in favor of this Alternative

### Consequences
The OIH must contain point to point transformations for all connected applications.
Without these transformation all end users (the kmu) using an OIH application must develop the transformations for the applications they want to connect.
