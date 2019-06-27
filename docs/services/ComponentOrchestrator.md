
---

**Creator:** Igor (drobiazko), Elastic.io <br>
**Last revised by:** Philipp (philecs), Cloud Ecosystem <br>
**Last update:** 04-06-2018

---

# Introduction

The service component orchestrator is responsible for a fair resource distribution.

# Description

The document shortly describes the service and its functionality.

# Service Implementation

**Framework Part:** [component orchestrator lib](https://github.com/openintegrationhub/openintegrationhub/tree/master/lib/component-orchestrator)

**Reference Implementation:** [component orchestrator service](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/component-orchestrator)

# Conceptional Elaborations

## Component Orchestrator

In a multi-tenant environment it must be guaranteed that a user or tenant
(intentionally or unintentionally) may not get an unfair usage of shared
resources such as CPU, Memory, Network, etc. It must be guaranteed that
every integration flow gets a chance to be executed, close to the intervals
defined by its Cron expression.

The Component Orchestrator is a micro-service defining the fairness policy
and controlling that each user/flow/tenant is complying with that policy.
The Component Orchestrator is responsible for:

* Protection from over-scheduling: if an execution of a flow takes longer than its scheduling interval, the following executions must be skipped.
* Making sure that a flow or its steps are not deployed multiple times
* If scaling is configured for a flow, the specified number of instances must be deployed
* Detection of policy violations and punishment of "bad citizens"
