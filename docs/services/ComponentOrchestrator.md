
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

# Conceptional Elaborations

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
