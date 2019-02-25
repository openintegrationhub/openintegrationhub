
---

**Creator:** Philipp (@philecs), Cloud Ecosystem e.V. <br>
**Last Modified:** 2018-09-26 <br>
**Last Modifier:** - <br>
**Version:** 1.0  <br>

---

# Status
accepted

# Context
_Question: At which steps of the execution is the transformer located?_

## Alternative 1: Between Adapter and SDF Adapter
Transformer is located between source adapter and sdf adapter.
Graphical representation:
<p align="center">
  <img src="../../SmartDataFramework/Assets/SDF_Overview_draft_0.7.png" alt="Sublime's custom image" width="400"/>
</p>

### Consequences
* Application specifics are handled in a coherent structure: connector
* Application specific data format is encapsulated within the connector
* The OIH API enforces the configured data domain and model
* Data validation can be implemented on the border between connector and sdf
* Raw data storage must be triggered before the transformer therefore in the connector too


## Alternative 2: Within SDF
Transformer is located within the SDF and not between source adapter and SDF adapter.
Graphical representation:
<p align="center">
  <img src="../../SmartDataFramework/Assets/SDF_Services.png" alt="Sublime's custom image" width="600"/>
</p>

### Consequences
* Application specifics are handled in multiple places: connector and sdf
* Data validation can not be implemented on the border between connector and sdf
* Data validation can be implemented within the sdf
* The OIH API allows all raw data formats
* Raw data storage must be triggered before the transformer therefore in the connector or sdf

## Decision
The decision was made in favor of **alternative 2**.
