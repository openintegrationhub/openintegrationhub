
---

**Creator:** Philipp (@philecs), Cloud Ecosystem e.V. <br>
**Last Modified:** 2018-09-26 <br>
**Last Modifier:** - <br>
**Version:** 1.0  <br>

---

# Status
accepted

# Context
_Question: Do we need an integration layer to provide functionalities such as aggregation, splitting etc.?_

## Alternative 1: Integration Layer Needed
An additional integration layer is used to realize integration patterns such as aggregation and splitting of objects.

### Consequences
The integration layer is used to support integration patterns like splitter, filter, aggregator.
It is also used to adapt application specific behavior, micro processes or apis.
The application specific behavior is explicitly modeled using the integration layer framework.

* Transformer would only be a mapper
* Object completness must be checked wihtin the connector ([object completeness alternative 1](objectCompleteness.md)) or the SDF ([object completeness alternative 2](objectCompleteness.md.md)). It would not be possible to outsource the responsibility to the application ([object completeness alternative 3](objectCompleteness.md.md)) itself as it is a precondition for aggregation.

## Alternative 2: Integration Pattern in Transformer
A transformer covers mapping functionalities and supports integration patterns such as aggregation and splitting of objects.

### Consequences
* Transformer would only be a mapper
* Object completness must be checked wihtin the connector ([object completeness alternative 1](objectCompleteness.md.md)) or the SDF ([object completeness alternative 2](objectCompleteness.md.md)). It would not be possible to outsource the responsibility to the application ([object completeness alternative 3](objectCompleteness.md.md)) itself as it is a precondition for aggregation.

## Decision
Based on the decisions made in the decision about the [transformerLocation](transformerLocation.md), the decision about the intefration layer was made in favor of **alternative 2**.
