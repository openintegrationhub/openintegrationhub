# Status
accepted
# Context
Coupling occurs when two applications share the same global data e.g. masterdata like customer information or when an application uses services from other applications.
How tight is the coupling between connected ISV applications? Should data be kept redundantly to other applications?

# Alternatives
## Alternative 1
### self-sufficient applications
The core functionality of the application can be used without runtime dependencies to other connected applications.
### Decision
The decision is made in favor of this alternative
### Consequences
Data kept within the application context might be redundant to other connected applications.

## Alternative 2
### tightly coupled applications
Data belongs to the primary system for this kind of data. If the data is used within other applications, a synchron call is needed.
### Decision
The decision is made in favor of alternative 1
### Consequences
The workflow in the application depends on the availability and response time of connected applications. This can influence the quality of service of the application itself.
