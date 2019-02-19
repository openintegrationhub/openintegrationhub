
---

**Creator:** Philipp (philecs), Cloud Ecosystem <br>
**Last revised by:** Stephan Pfeiffer <br>
**Last update:** 11-01-2019

---
# Pre Considerations

Intitally there were three services planned to be implemented within the OIH scope.

These are:

1) CRUD Monitoring (name changed to Audit Logging) - [Audit Log definition](https://microservices.io/patterns/observability/audit-logging.html)
2) Logging and Monitoring
3) Reporting and Analytics

A design and architecture decision is needed in the area of:

1) do we still need all three services?
2) Do we need to redesign scope / functionality of the services?
3) Do we skip and aggregate services?

# Review of Requirements (FDE / SPF / PHO)

Mainly we have requirements from the partners in the aerea of the audit service. Therefore the requirements regarding monitoring of the plattform and interfaces needs a discusion and as well if a technical event logging is needed.

Audit mainly points into:

- tracking of user activity
- user intercation with components and API functionalty
- administrative actions (like create a tenant)


Example Event to be logged:
```php
{ logType: 'Event',
  actor: 'user id or something',
  date: 2019-01-16T08:16:11.899Z,
  origin: 'maybe service name, script name or function',
  action: 'what just happened',
  label: 'the affected target name perhaps',
  object: 'target id',
  description: 'additional info, JSON, etc.' } 
```

# Conclusion

The team decided to take the first list of requirements as baseline for the first implementation of the audit logging service.

Therefore WICE needs to review and rework the overall list into a epic and several user stories. The user stories need a review of the development team to be complete and aligend to the goals of the group.


# Introduction

This document is a consolidation of all current stakeholders relating to the crud monitoring / audit log / audit trail services.

Currently several synynoms exist for this service. For the sake of simplicity the service is called `crud monitoring` in the following.

## Description

In the following all currently existing requirements are listed. The requirements are seperated by partner and will later act as the basis for the implementation of the crud monitoring service.

## Requirements

### Basaas

- Activity log
- Right management must be considered
- Provisioning of npm library for logs
  - Would prefer to send to stdout instead of http calls
  - Reason: Reliability/Retries, Scalability

### Cloud Ecosystem

- log all administrative interactions with the system
- provide an api to be used in different implementation languages (JavaScript, Java)
- log should be persistent
- DSGVO compatiblity (remove user correlation but dont delete events)


### Elastic.io

- Crud Monitoring service should track: "who did what and when"
- Audit-proof, long-term storage of data
- Crud Monitoring service API should have endpoints for creating and reading (no deletion possible)
- There must be a contract how the data that is sent to the service must look like (consistent data format)
- Other services should actively push data to the crud monitoring service
- Events should be queued
  - Chronological order of the incoming events is important

### Wice

- Event format has to be defined
  - Consistent meta data across all events (servicename, timestamp, instance name, event-level, tenantID)
  - (Individual) payload from pov of service (event name, reason, event description [object, userId, tenantId, action, status], further descriptive information)
- API / Service interface
  - Only GET via LOGIN-Token (GET ALL with filter, page and limit)
  - API should only be accessible internally
  - Right management must be considered (e.g. a tenant admin can only access the events of his/her tenant)

### Data Privacy

- As a user of the framework, I would like to store as little personal data as possible in the services for data protection reasons.
- As a user of the framework, I must be able to provide information about which personal data, when and where are stored in the services for data protection reasons.
- As a user of the framework, I must ensure that personal data can be deleted from the services at any time for data protection reasons.
- As a user of the framework, I have to justify why personal data is stored in the services for data protection reasons.
- As a user of the framework, I must ensure that personal data can be deleted from the service based on a time filter, so that personal data isn't stored longer than necessary.
  
## Open Questions

- What kind of information should be stored?
- Which data should be provided by the other service?
