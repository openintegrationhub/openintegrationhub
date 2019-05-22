# Dispatcher Service

The dispatcher service is a central component in the hub and spoke service collaboration. 
It is responsible for delivering messages from one application to the target applications configured by the tenants.

![Dispatcher Service Overview](https://github.com/openintegrationhub/openintegrationhub/blob/dispatcher/Assets/component_dispatcher_0.1.png)

Entrypoint
The service is triggered by messages arriving through a SDF Adapter Component used in a Connector Flow. 
