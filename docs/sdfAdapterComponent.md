# Introduction

The Smart Data Framework Adapter (SDF-Adapter) allows flows to communicate with the smart data framework. It is responsible for forwarding the incoming events to the smart data framework. Furthermore, it is responsbile for increasing the ease of use for connector developers as it masks service endpoints.

## Entrypoint

The SDF-Adpater is triggered by incoming events received from either the adapter or the transformer (depending on oih operator configuration).

## Message Processing

If a message arrives from the preceding component it is forwared to the correct service(s)/queue(s). One possible recipient of the forwarded message is the [dispatcher component](component-dispatcher.md).

![sdfAdapter](assets/sdfAdapter.png)