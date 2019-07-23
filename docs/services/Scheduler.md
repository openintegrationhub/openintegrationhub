
---

**Creator:** Igor (drobiazko), Elastic.io <br>
**Last revised by:** Philipp (philecs), Cloud Ecosystem <br>
**Last update:** 04-06-2018

---

# Introduction

The service scheduler is responsible for a periodical execution of integration flows.

# Description

The document shortly describes the service and its functionality.

# Technologies used

- Cron-Deamon

# Service Implementation

**Framework Part:** [scheduler lib](https://github.com/openintegrationhub/openintegrationhub/tree/master/lib/scheduler)

**Reference Implementation:** [scheduler service](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/scheduler)

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