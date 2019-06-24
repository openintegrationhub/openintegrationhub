
---

**Creator:** Igor (drobiazko), Elastic.io <br>
**Last revised by:** Philipp (philecs), Cloud Ecosystem <br>
**Last update:** 04-06-2018

---

# Introduction

The two services scheduler and resource coordinator are responsible for a fair resource distribution and a periodical execution of integration flows.

# Description

The document shortly describes the two services and their functionality. This includes:

- Exemplary cron expressions
- Responsibilites of the resource coordinator

# Technologies used

- Cron-Deamon
- Tbd for resource coordinator

## Reasoning

- Tbd

# Conceptional Elaborations
## Scheduler

In the Integration Hub there is a great number of active integration flows
to be executed periodically. Each integration can be configured with a
[Cron](https://en.wikipedia.org/wiki/Cron) expression defining flow's execution
interval. Let's consider the following Cron expression:

````sh
*/3 * * * *
````

The cron expression above executes an integration flow at every 3rd
minute starting from the flow's start time.

With the following Cron expression a flow is executed every Sunday at 6:00 am:

````sh
0 6 * * 7
````

The Scheduler iterates over all active integration flows and evaluates
their Cron expressions. Is a flow due to be executed, Scheduler tells the
Resource Coordinator to deploy the integration flow for execution.

## Resource Coordinator

In a multi-tenant environment it must be guaranteed that a user or tenant
(intentionally or unintentionally) may not get an unfair usage of shared
resources such as CPU, Memory, Network, etc. It must be guaranteed that
every integration flow gets a chance to be executed, close to the intervals
defined by its Cron expression.

The Resource Coordinator is a micro-service defining the fairness policy
and controlling that each user/flow/tenant is complying with that policy.
The Resource Coordinator is responsible for:

* Protection from over-scheduling: if an execution of a flow takes longer than its scheduling interval, the following executions must be skipped.
* Making sure that a flow or its steps are not deployed multiple times
* If scaling is configured for a flow, the specified number of instances must be deployed
* Detection of policy violations and punishment of "bad citizens"
