# Microservice Overview

## OIH APIs
**Workgroup Manager: Igor (Elastic.io)**

|Framework|Microservice Name|Responsibility|Official Deadline|Current Overall Status|Link to documentation|
|---|---|---|---|---|---|
|Integration Framework|Integration Framework API|Elastic.io GmbH|31.03.2018|**Description:** Initial <br> **Development:** |See: [Service APIs](https://www.openintegrationhub.org/developers/), [IAM](http://iam.openintegrationhub.com/api-docs/), [secret-service](http://skm.openintegrationhub.com/api-docs/) and [icr](http://icr.openintegrationhub.com/api-docs/)|
|Smart Data Framework|Smart Data Framework API|Elastic.io GmbH|31.03.2018|**Description:** Initial <br> **Development:** -||

## Secure Access Control
**Workgroup Manager: Selim (Basaas)**

|Framework|Microservice Name|Responsibility|Official Deadline|Current Overall Status|Link to documentation|
|---|---|---|---|---|---|
|Integration Framework|Authentication / Authorisation / User Management & Identity Management|Basaas GmbH|30.06.2018|**Description:** Finished <br> **Development:** [Published (WIP)](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam)|See: [Concepts](services/IAM/IAMConcept.md) and [service documentation](https://github.com/openintegrationhub/openintegrationhub/blob/master/services/iam/README.md)|
|Integration Framework|Secure-Key-Management|Elastic.io GmbH|30.06.2019|**Description:** Initial <br> **Development:** [Published (WIP)](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/secret-service)|See: [Concepts](services/SecureKeyManagementConcept.md) and [service documentation](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/secret-service/README.md)|

## Message Processing
**Workgroup Manager: Igor (Elastic.io)**

|Framework|Microservice Name|Responsibility|Official Deadline|Current Overall Status|Link to documentation|
|---|---|---|---|---|---|
|Integration Framework|Message oriented Middleware|Elastic.io GmbH|31.03.2018|**Description:** Initial <br> **Development:** Deployed on K8s Cluster|See: [MessageOrientedMiddleware](services/MessageOrientedMiddleware.md)|
|Integration Framework|Communication Router|Elastic.io GmbH|31.12.2018|**Description:** Initial <br> **Development:** [Published](https://github.com/openintegrationhub/openintegrationhub/services/communication-router)|See: [CommunicationRouter (WIP)](services//CommunicationRouter.md)|
|Smart Data Framework|Notification and Event Bus|Wice GmbH|30.06.2018|**Description:** [Draft](https://github.com/openintegrationhub/Microservices/blob/MessageandEventBusConcept/MessageProcessing/MessageandEventBus.md) <br> **Development:** -|See: [Concept Draft](services/MessageandEventBus.md)|
|Integration Framework|Resource Coordinator|Elastic.io GmbH|30.06.2019|**Description:** Alpha <br> **Development:** [Alpha Published (WIP)](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/resource-coordinator)|See: [service documentation](https://github.com/openintegrationhub/openintegrationhub/blob/master/services/resource-coordinator/README.md)|
|Integration Framework|Scheduler|Elastic.io GmbH|30.06.2019|**Description:** Initial <br> **Development:** [Published (WIP)](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/scheduler)|See: [Scheduler and Resource Coordinator](services//SchedulerResourceCoordinator.md)|
|Smart Data Framework|Conflict-Management|Wice GmbH|30.06.2019|**Description:** - <br> **Development:** -|-|
|Smart Data Framework|Secure Attachement Storage|Elastic.io GmbH|31.12.2018|**Description:** - <br> **Development:** -|-|

## Repository Management
**Workgroup Manager: Igor (Elastic.io)**

|Framework|Microservice Name|Responsibility|Official Deadline|Current Overall Status|Link to documentation|
|---|---|---|---|---|---|
|Integration Framework|Integration Component (Adapter) Repository|Elastic.io GmbH|31.03.2019|**Description:** Initial <br> **Development:** -|See: [IntegrationComponentRepository](services//IntegrationComponentRepository.md)|
|Integration Framework|Integration Content Repository|Wice GmbH|31.03.2018|**Description:** Initial <br> **Development:** [Published](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/integration-content-repository)|See: [IntegrationContentRepository](services/IntegrationContentRepository.md) and [service documentation](https://github.com/openintegrationhub/openintegrationhub/blob/master/services/integration-content-repository/README.md)|
|Smart Data Framework|Metadata Repository|Elastic.io GmbH|30.06.2019|**Description:** [Draft](services/RepositoryManagement) <br> **Development:** -|-|
|Smart Data Framework|Master Data Repository|Elastic.io GmbH|30.06.2018|**Description:** - <br> **Development:** -|-|
|Smart Data Framework|Hierarchy and Relationship Management|Wice GmbH|30.06.2019|**Description:** - <br> **Development:** -|-|

## Management Services
**Workgroup Manager: Selim (Basaas)**

|Framework|Microservice Name|Responsibility|Official Deadline|Current Overall Status|Link to documentation|
|---|---|---|---|---|---|
|Integration Framework|Logging & Monitoring|Elastic.io GmbH|30.06.2019|**Description:** Initial <br> **Development:** -|See: [Logging and Monitoring](services/LoggingMonitoring.md)|
|Smart Data Framework|Reporting and Analytics APIs|Basaas GmbH|30.06.2019|**Description:** - <br> **Development:** -|-|
|Smart Data Framework|CRUD Monitoring|Wice GmbH|31.12.2018|**Description:** Initial <br> **Development:** -|See [Audit Log](services/AuditLog/AuditLog.md), [Audit Log Requirements](services/AuditLog/CRUDMonitoringRequirements.md) and [Message Format](services/AuditLog/MessageFormat.md) |
