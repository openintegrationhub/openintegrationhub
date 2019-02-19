
---

**Creator:** Philipp (@philecs), Cloud Ecosystem e.V. <br>
**Last Modified:** 2018-09-26 <br>
**Last Modifier:** - <br>
**Version:** 1.0  <br>

---

# Status
accepted

# Context
_Question: Which interaction styles should be supported by the Open Integration Hub?_

Graphical overview:
<p align="center">
  <img src="../../SmartDataFramework/Assets/InteractionStylesV2.0.png" alt="Sublime's custom image" width="500" heigth=700/>
</p>

## Usecase 1: Message sent from ISV application to OIH
An application sends a message (e.g. createCustomer) to the OIH without relying on a response.

## Usecase 2: Message sent from OIH to ISV application using Webhooks
OIH sends a message (e.g. updateCustomer) to an ISV application using a webhook from the application

## Usecase 3: Request/Reply from OIH to ISV application
OIH sends a request (e.g. getCustomerDetails) to an ISV application and awaits a response (e.g. the customer details)

**See [request missing information](requestMissingInformation.md) for discussion of this usecase**

## Decision
- **Usecase 1** is supported
- **Usecase 2** is supported
- **Usecase 3**: At this point (2018-09-26) the workgroup decides that this usecase is not supported. _This decision was made under the premise that it might be reversed._
