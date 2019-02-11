
---

**Creator:** Philipp (@philecs), Cloud Ecosystem e.V. <br>
**Last Modified:** 2018-09-26 <br>
**Last Modifier:** - <br>
**Version:** 1.0  <br>

---

# Status
accepted

# Context
_Question: Is it possible to retrieve/request missing required objects from OIH?_ In case of "yes": _How does the transformer/integration layer retrieve/request missing required objects?_

## Alternative 1: Information Request from SDF is Not Possible
It is not possible to request missing transformation from SDF.

### Consequences
* Aggregration must be realized with other mechanisms such as temporarily storing the message in a persistent and queryable database/queue (probably shared by all instances of this tenant specific connector) untill missing data is available and previous objects can be processed OR
* Aggregration is not possible
* Connector must be able to read and write data from this storage

### Questions:
* Which limits/quotas should exist for the queue? Do entries have a ttl?

## Alternative 2: Information Request Possible
It is possible to request missing information from Open Integration Hub.

<p align="center">
  <img src="../../SmartDataFramework/Assets/RequestInformationConnector.png" alt="Sublime's custom image" width="500" heigth=700/>
</p>

### Consequences
* Open Integration Hub must provide mechanisms to gather missing information e.g.
	* It must be able to actively request information from an application _or/and_
	* Implement functionality to temporarily store the incomplete information until missing information arrives
* The connector could skip the aknowledgement of a message, which could lead the SDF to keep this data set and make it queryable by the connector in future (with a max ttl?)

## Decision
The decision was made in favor of **alternative 1**. As the decision in [object completeness](https://github.com/openintegrationhub/Architecture/blob/sdf-draft/Decisions/closed/objectCompleteness.md) was made in favor of _alternative 2_, this decision here is obvious. _This decision was made under the premise that it might be reversed._
