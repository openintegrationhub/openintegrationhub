# Dispatcher Service

The dispatcher service is a central component in the hub and spoke service collaboration. 
It is responsible for delivering messages from one application to the target applications configured by the tenants.

![Dispatcher Service Overview](https://github.com/openintegrationhub/openintegrationhub/blob/dispatcher/Assets/component_dispatcher_0.1.png)

## Service
### Entry Point

The service is triggered by messages arriving through a SDF Adapter Component used in a Connector Flow. 

### Tenant specific configuration

Each tenant owns a configuration which specifies his applications and their synchronization behavior.
The configuration contains information about:
* which application is connected to another applications
* full duplex/half duplex connections
* leading system configuration

| applicationId | connected to OIH | inbound | outbound |
| ---------- | ------------- | ------ |
| crm1 |  true | true | true |
| contactmanagement2 |  true | true | true |


For each received message, the configuration is evaluated to determin how to process the message. 
Message characteristics relevant for the dispatcher service:
* tenant id
* source application
* source operation

After evaluating the tenant specific configuration for a message, the configured target applications are known.

### message processing

If a tenant specified one or more connected application which should receive the message, the original message is duplicated for each target application. Those messages will be delivered to the target applications.
Each of those messages has new message id. The transaction id will remain the same.
