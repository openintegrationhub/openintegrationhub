_Moved from board repository_

# Status
accepted Alternative 4
# Context
See https://github.com/openintegrationhub/coordination/issues/14 regarding the communication style.
How to design transformations between application specific data models?
The OIH TVB description explicitly mentions a master data model.
Should the OIH use a master data model?
An ISV application has an application specific data model. When multiple ISV applications within the same data domain are connected to the OIH, different application specific data models exists for the domain.
To share data between applications over the OIH, it is neccessary to be able to convert data between the different application specific data models.

"In general, automatic schema mapping is an AI-Complete problem, [...]" - 
Halevy, Alon, Anand Rajaraman, and Joann Ordille. "Data integration: the teenage years." 2006 https://homes.cs.washington.edu/~alon/files/halevyVldb06.pdf


# Alternatives
## Alternative 1
A master data model is introduced. Transformations between the master data model and the application specific data models are created.
### Decision
the decision was made in favor of Alternative 4
### Consequences
Low amount of transformations needed(n for n applications using this domain model). If an application specific data model changes, only one dependend transformation needs to be changed.

## Alternative 2
No master data model used. Transformations between each application specific data model are created.
### Decision
the decision was made in favor of Alternative 4
### Consequences
High amount of transformations needed(n*(n-1)/2 for n applications using this domain model). If an application specific data model changes, all (n-1) dependend transformations needs to be changed.

## Alternative 3
Instead of a master data model, a broader definition e.g. an ontology like OWL is created. Based on the ontology,  transformations between application specific data models are created automatically.
See:
- OWL 2 (https://www.w3.org/TR/2012/REC-owl2-overview-20121211/)
- Erhard Rahm, Philip A. Bernstein "survey of approaches to automatic schema matching", 2001 (http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.16.700&rep=rep1&type=pdf)
- Christian Drumm "Improving Schema Mapping by Exploiting Domain Knowledge",  2008 (https://publikationen.bibliothek.kit.edu/1000009968/614220)
### Decision
the decision was made in favor of Alternative 4
### Consequences
Base on the approach, domain specific ontologies or specifications need to be created. 

## Alternative 4
A combination of Alternative 1 and Alternative 2 is used. It is possible to use a master data model and it is also possible to directly connect two application specific models. 
### Decision
the decision was made in favor of this Alternative
### Consequences
Depending on the usecase, a matching implementation can be chosen. 
Connectors created without a masterdatamodel can not be used from within the context of the masterdata model.
