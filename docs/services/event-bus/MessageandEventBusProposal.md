
---

**Creator:** Hansjörg Schmidt (hschmidthh), Wice GmbH <br>
**Last revised by:** -  <br>
**Last update:** 02-11-2018 <br>
**Version:** 0.1 <br>

---

# Message and Event Bus

# Introduction

This document describes the evaluation of the "Message and Event Bus".
This Service is part of the integration services of the Open Integration Hub.

# Description

## Purpose of the Message and Event Bus

The Open Integration Hub requires collaboration of multiple decoupled internal and external systems.

With flexibility comes added complexity to the overall design. That's why an architecture that effectively supports such interactions is desired.

With message and event queueing we can handle this requirements effectively.

The Message and Event Bus is a backspine of the OIH, because message queues provide a repository for messages and guarantee their delivery in a flexible and growing ecosystem.

## Requirements for the Message and Event Bus

Within the Open Integration Hub we have to consider how we are fulfilling the following tasks:

- How do we deal with the integration tasks which we want to deliver?
- How do we deal with messages and events which come from the decoupled systems?
- Do we need different kind of objects, like commands or notifications?

The answers to these questions will impact the architectural decisions:

- Will there be a central queue, which caters every message or event or do we need different queues?
- If we have a series of message queues, can we strung them together to perform complicated or multi-step processes?
- How do we handle system identification and
- If the message is a command, then it's a signal to the receiver to do something. How do we handle the senders and receivers?
- If the message is a notification, then it's a signal to the subscriber that some system event has occurred. How do we handle the PubSubs?
- Additional security measures may be necessitated when a message travels from one message processor to another inside and especially outside the system. How do we handle this?

# Technology Used

Specialized message queueing services cater for these I/O operations and provide an optimized way to enqueue and dequeue messages.

A common and most wideley used queueing service is RabbitMQ, which we consider for the implementation. RabbitMQ is an open source message broker software, which can handle more than 1 Mio requests per second. Client libraries to interface with the broker are available for all major programming languages.

If needed, data from the queues itself can be stored in any type of storage system. We consider MongoDB for this task.

Since most of the processing takes place asynchronously in the background, it is imperative to log all processing steps and record all exceptions encountered. Here we can combine our bus with the logging and monitoring systems inside the OIH, e.g. the crud monitoring service.

# Concept of the Message and Event Bus

To deliver reliable and flexible integration workflows, we consider the "Command Query Responsibility Segregation" (CQRS) pattern combined with the "Event Sourcing" pattern. This encourages separation of concerns and decoupling of subsystems.

Following this patterns inside the OIH-ecosystem, each service does its job and passes a message along to the next processing unit through the Message and Event Bus. Such modularity allows us to extend the system fairly easily and creates automatically bounded contexts.

The services inside the OIH translate their concerns into message commands or events. A message defines a unit of work to be performed. It contains all the information needed to process the task. It can contain additional informations, such as timestamps, time to live, versioning for proper handling and more. And it includes the message payload.

The message payload is serialized in a ubiquitous JSON format.
Serialization of a message into a common format allows inspection and
comprehension of messages by disparate systems. The serialized message is then
placed into a queue by one system and dequeued and processed by another system.

Commands are handled according to the principle of event sourcing. Each command is first directed to the appropriate microservice where it is validated. If the command is valid and successful, then this microservice generates a corresponding event. The generated event will continue to be transmitted to the other microservices, which may then perform further actions and generate events based on it.

Events can be queued as new commands or notifications. For each type of command or notifications exchanges and topics can be defined and subscribed by different systems.
