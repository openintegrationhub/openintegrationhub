# Introduction

This document describes the evaluation of the work package formerly known as "CRUD Monitoring". This work package is part of the Open Integration Hub.

After a first draft of a "CRUD Monitoring" service, we changed the scope of the service and decided to develop an "Audit Log"-Service. After some evaluations we now try to broaden the scope to a more general log monitoring from which we can do different kind of audits and other kind of monitoring, e.g. performance and error logging.

Log monitors are a type of software that monitor log files. Servers, application, network and security devices generate log files. Errors, problems, and more information is constantly logged and saved for analysis. The log monitors scan the log files and search for known text patterns and rules that indicate important events.

One crucial task is the audit logging. An audit log is a chronological record of system activities to enable the reconstruction and examination of the sequence of events and / or changes in an event. In the case of user audit log it helps to know what actions a user has recently performed.

## Description

### Purpose of log monitoring

In order to detect problems and see the status of the system automatically, system administrators set up monitors on the generated logs. Once an event is detected, the monitoring system helps to identify events that occurred or might occur.

For an audit log the log monitoring can be used to prevent suspicious activity when it starts (if actively monitored), or to play back account activity during an incident review. Because of the nature of the OIH it's crucial to do this, because without appropriate audit logging, any security critical activities can go unnoticed. And evidence of whether or not a possible attack led to a breach can be inconclusive.

### Requirements for log monitoring

Within the Open Integration Hub we have to consider how we are fulfilling the following tasks for logging and monitoring:

- log the relevant activity into a system that is immutable
- time stamp this activities
- let them be accessible by admin accounts
- let them be exportable

For an audit log data should never change. By default an audit log should generally be kept for 1-3 years. The timeframe should be documented and configurable (generally shorter) for customers who have data retention requirements.

### Events to audit log

Audit logging functionality requires a clear understanding of which events should be recorded in the audit log. The ISO-27002 specifications provide some clarity about what enterprise customers will likely need to have logged.

Generally, the specific content of a target is not audit logged, rather the state or context is logged.

Examples of events that should be audit logged are as follows:

- specific user activities,
- exceptions,
- information about security events (successful and rejected events),
- use of privileges and the use of advanced privileges
- failed login attempts
- administrative configuration changes

Actions can generally be categorized into their CRUD type (i.e. Create, Read, Update, or Delete).

In case of a logged event we need to provide enough information about the event to provide the necessary context of who, what, when and where etc.

## Technology Used

The Open Integration Hub is running inside a Kubernetes cluster with all the Docker containers for the microservices and the integration flows. The easiest logging method for containerized applications is to write to the standard output and standard error streams. In Kubernetes one can implement cluster-level logging by installing a logging agent on each node. Most of the K8s hosting services provide this by default.

Elasticsearch, Logstash and Kibana, known as ELK stack or Elastic stack are very common tools for logs aggregation and analysis.

For the first draft of a CRUD Monitoring Service, we evaluated Logstash very deeply. Logstash is a tool to collect, parse and store logs and events. It reads the logs via so called inputs, parses, aggregates and filters with the help of filters and stores by outputs. Logstash provides an input stream to Elasticsearch for storage and search, and Kibana accesses the data for visualizations such as dashboards.

Elasticsearch is a search engine based on the Lucene library. It provides a distributed, multitenant-capable full-text search engine with an HTTP web interface and schema-free JSON documents.

Kibana is an open source data visualization plugin for Elasticsearch. It provides visualization capabilities on top of the content indexed on an Elasticsearch cluster.

To feed the logs to the ELK stack we need some more tools, like "Beats". With Beats we can gather log data from different sources and then centralize the data in Elasticsearch.

## Monitoring and Logging Concept

At first, Logstash extracts the monitored data with event processing. This process consists of three stages: Input, then filtering and at last the output. Logstash is controlled through proprietary config files, which are mounted in a dedicated volume.

In the input stage Logstash gets the data from the source. Upon receiving events, Logstash performs an action based on the conditional filter, which means it will be transformed from unstructured to structured data. So we will have a normalised schema which is enriched with relevant metadata.

Logstash then delivers the data to Elasticsearch. Elasticsearch will typically store a document once for each repository in which it resides. Each document is a simple set of correlating keys and values: the keys are strings, and the values are one of numerous data types—strings, numbers, dates, or lists.

With Kibana we can search, view, and interact with data stored in Elasticsearch indices. Its simple, browser-based interface enables you to quickly create and share dynamic dashboards that display changes to Elasticsearch queries in real time.

On the Google Compute Engine (GCE) platform, the default logging support targets Stackdriver Logging. As of now you cannot automatically deploy Elasticsearch and Kibana in the Kubernetes cluster hosted on Google Kubernetes Engine. You have to deploy them manually.

## API Specs

[Draft 0.0.2](https://app.swaggerhub.com/apis/SvenHoeffler/AuditLogProposal/0.0.2#/)