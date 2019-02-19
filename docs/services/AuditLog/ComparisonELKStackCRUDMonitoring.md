# Comparison ELK Stack and CRUD Monitoring

# Introduction

This document describes the evaluation of the work package formerly known as "CRUD Monitoring". This work package is part of the Open Integration Hub. After a first draft of a "CRUD Monitoring" service, we changed the scope of the service and decided to develop an "Audit Log"-Service.

In this document we compare the two evaluated options for an audit log service with a specific microservice (aka CRUD Monitoring) and on basis of the common "ELK Stack".

# Design considerations:
For audit-log purposes there should be a defined message format or keyword to keep track of all audit related output from the OIH.

## PROS and CONS of the ELK-Stack

PROS:
- easy to search because of access to Elasticsearch
- interface with several visualization options
- possibility to create a dashboard

CONS:
- ~2gb of ram per instance (the default ram of a n1-standard-1 google cloud instance is not sufficient for stable operation, since the ram is also used by system processes)
- possible delay before data can be queried in Kibana, because it has to be indexed by Elasticsearch first.
- unlike in the CRUD-monitoring microservice there is no option foreseen to allow actions based on the incoming audit data, like an alert for example.

## Comparison to CRUD-Monitoring-Service:

### ELK-Stack
Good for monitoring the entire system as system administrator.
- Flexible search options
- Premade visualization tools
- Users can see the entire data (this can be partially avoided by using X-Pack security, but then requires creation of separate indexes for each tenant / user and is hard to manage)
- Huge memory requirements
- Complicated query language
- User needs good it-knowledge
- Requires installing and managing several tools (Elasticsearch, Logstash, Kibana, Filebeat)
- Harder to merge data from various sources

### CRUD-Monitoring
Can monitor the entire system, but also can be limited to prevent users from seeing others data. Besides of that it leaves room to extend it.
- Open for integrating access control and privileges (tenants/users)
- Open for integrating actions based on received data
- Could implement a strategy to merge data from several sources into a richer representation
- Less heavy, much lower memory requirements
- Easy API
- Chance to create an easier and customized API and / or visualization for users
In both cases we will need to define clearly how the microservices report the events (data structure and data transport)
