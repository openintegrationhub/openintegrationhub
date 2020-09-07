
---

**Creator:** Philipp (@philecs), Cloud Ecosystem e.V. <br>
**Last Modified:** 2018-09-26 <br>
**Last Modifier:** - <br>
**Version:** 1.0  <br>

---

# Status
accepted

# Context
_Question: How does SDF decide when an object is complete to be sent to the target system? (Empty optional fields in meta model might be still required in the target system)_ /
_Question: Which component does decide if an object is complete to be sent to the target system?_

It is possible that an object fits the minimal criteria of the OIH and provides all required fields. For some applications that might be sufficient but others need more information.

An example from e-commerce domain: The OIH accepts a product object that only includes basic product information but does not include further information such as price or availablity.
For some systems such as CRM systems these information are sufficient. For others, such as webshops, price and availability are mandatory information. Without these information the product can not be created within the webshop.

## Alternative 1: Connector Responsibility
SDF does not decide if an object is complete but the connector is responsible for a contentual validation. That means, if the object passes internal technical validation (all required fields are provided) the data is sent to target connector.

<p align="center">
  <img src="../../assets/q1Alt1.png" alt="Sublime's custom image" width="500" heigth=700/>
</p>

### Consequences
Target application connectors have to decide on object completeness and have implement a mechanism to handle incomplete data.

Some possible mechanisms could be:
* Request missing information from SDF (if functionality is provided by OIH. See [request missing information](requestMissingInformation.md))
	* This request/notification about missing information is sent to SDF and message stored in message queue
		* Message is either resent to target connector if missing information is available
		* After a predefined time period the message is discarded
* The incomplete object is discarded


## Alternative 2: SDF Responsibility
SDF has mechasnisms to decide if an object is complete and ready to be sent to the target system.

<p align="center">
  <img src="../../assets/q1Alt2.png" alt="Sublime's custom image" width="500" heigth=700/>
</p>

### Consequences
Each application has to communicate its restriction (minimal required attributes for a complete object) to the Open Integration Hub. Open Integration Hub has to compare the current message with requirements and decide if the object is sent to the target application.

* Open Integration Hub has to know restrictions for all connected applications
	* If an update of the restritions happen, these updates must be communicated to the OIH in order to ensure proper completeness checks
* If message is not ready to be sent it can/must be temporarily stored until missing information is available
	* If predefined time period exceeds the message is discarded

## Alternative 3: Application Responsibility
Logic regarding contententual completeness-checks and aggregation are tasks of the applications themselves. I.e. the Open Integration Hub does not decide whether an object is complete in the sense of a specific application. Technical validatation remains within the Open Integration Hub.

<p align="center">
  <img src="../../assets/q1Alt3.png" alt="Sublime's custom image" width="500" heigth=700/>
</p>

### Consequences

* Open Integration Hub does guarantee semantic (mapping) and syntactic (technial) correctness but not contentual correctness
	* OIH does not check the correctness of the values themselves or if an object is complete in the sense of the target applications
* [Integration layer](integrationLayer.md) would be obsolete because aggregation logic would be in the responsibility of the applications. Therefore the Open Integraion Hub or its connectors do not provide an integration layer and functionalities such as aggregation and splitting fall within the scope of the application.

## Decision
Based on the decisions made in the decision about the [transformerLocation](transformerLocation.md), the decision about the intefration layer was made in favor of **alternative 2**.
The decision made in transformer location indicates that the transformer is a part of the smart data framework.
