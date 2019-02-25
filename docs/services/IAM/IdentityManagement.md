# Identity Management

 This document describes the evaluation of identity and access management within the Open Integration Hub.

 ## Why is Identity and Access Management necessary?



 ## Types of identities
 OIH consists of multiple services and agents with different roles and authorization. Given the fact, that we are dealing primarily with machine-to-machine interaction, we can use machine identites (aka. `Service Accounts`) for authentication and authorization of these machines.


 ## Which entities should be managed?

 We can cluster the digital identites of OIH into three categories:
 * `Master` (e.g. administrative application which managed the OIH via REST-API)
 * `Connector`
 * `Tenant`


 ### Master
 This actor has a privleged admin access to OIH and can define which Connectors should be (de)-provisioned. This actor can also define intergration flows on behalf of a tenant between two or more ISV connectors.
 Additionally, this system is authorized to manage identites/accounts (e.g. service accounts) for connectors, tenants, etc.

 ### Connector
 A connector is a service which can trigger an action on behalf of the user or master, e.g. create a tenant, modify tenants customer data. This requires the connector to provide a valid access token or a valid service account containing these priveleges. The required privilges are granted by tenant account (or tenant admin) through OIH. Whenever such change occurs, the connector could send an event to OIH providing it's access token. OIH verifies the access token and the claims.

 ### Tenant and Tenant Users
 Each tenant and tenant users have an identity in OIH (main identity). Whenever a tenant account is created in one of the ISV systems via OIH, a new remote identity is created in OIH and linked to the main identity. This creates a relation (a graph) between the main identity and all corresponding remote identites.
 Tenant (or tenant admin) have access to tenant resources and can grant access to a connector via OIH to read/write to these resources.
 Example: tenant can grant access to an ISV connector C1 read and write access to it's customer data and another ISV Connector C2 only read access. These access grants are required to define an integration flow of customer data from C1 to C2.

 ![Tenant Identities](https://github.com/openintegrationhub/Microservices/blob/master/SecureAccessControl/assets/identities-linked.png)




 In a very basic scenario one could use a `Master` account to provision connectors, to manage tenants, etc.

 The `Master` account is preveleged to create a `Tenant` and thus a tenant identity. For any further API calls to OIH on behalf of the tenant organization (e.g. to create the tenant in one of the vendor application through a corresponding `Connector`) it could be favorable to use the tenant identity instead of the `Master` identity. This allows for authorization mechanisms by design and better means of audit logging. In case of a marketplace like _Basaas_, the `Tenant` and all `Tenant` users   SSO mechanisms are managed by the marketplace. This also means, that the marketplace could store and transmit for each `Tenant` their specific Token/Service Account. To accomplish that, the `Master` system like the marketplace would also need either to store these Tokens/Service Accounts or to be able to fetch them from OIH.

 The following example workflow tries to illustrate such scenario:


 * Master System uses `service account` to create a `tenant`
  * OIH creates `tenant`
  * Master System fetches the `tenant service account` and stores it for future requests
 * `Tenant admin` creates an account in the solution ACME Inc.
  * Master System uses the `tenant service account` to create a tenant account in ACME Inc. through OIH
  * OIH triggers the `Connector`to create the tenant in ACME Inc.
  * `Connector` creates tenant and returns it's internal `TenantId`
  * OIH saves the new `TenantId` and connects it to the existing OIH tenant-id

 Following figure illustrates the services and the identities/service accounts.

 ![Service Accounts](https://github.com/openintegrationhub/Microservices/blob/master/SecureAccessControl/assets/identities-oih.png)


 Another case of identities in use is when a `Connector` requires authorization for a vendor backend. Assuming an ISV named ACME Inc. has an RESTful API with OAuth 2.0 support. ACME creates a Connector. For every REST call the connector has to provide a valid access token for the associated tenant account. Given that a connector has no persistence, such tokens and other authentication/authorization mechanisms can be stored and provided from OIH. A possible workflow might be as follows:
 * OIH and connector negotiate the supported authentication methods between OIH ↔ Connector ↔ ACME Backend or the OIH supports only OAuth 2.0 and requires access token for ACME
 * OIH triggers a connector to create a tenant account in ACME ~~and provides an access token for this operation~~
 * Connector calls ACME backend with ~~the given~~ token and creates a tenant on behalf of OIH
 * ACME returns new access token for this particular tenant
 * Connector transmits this tenant specific access token to OIH
 * OIH saves the token and either uses it for all future calls for this particular tenant or provides means for a connector to fetch such token when needed
 * Tenant admin creates an action through OIH
 * OIH requests tenant consent (UI) and triggers the requested action afterwards

 ![Access Mngmt OIH - Basaas - ISV](https://github.com/openintegrationhub/Microservices/blob/master/SecureAccessControl/assets/access-mngmt-oih-basaas-isv.png)


 There are most likely different strategies/possibilities to use identity management to perform actions on behalf of the user. Some of these actions may be:
 * Modify use data, e.g. user changed her lastname
 * Extract tenant data from an ISV and import that data into another ISV

 Given the fact that some ISVs may have an existing API based on OAuth, Rest with Access Control, etc. we must consider if there is a "one size fits all" solution or whether the OIH must be capable of applying different strategies, e.g. requiring user's authorization by using her identity in context of OAuth 2.



 ## Identity Resources and Identity provider


 The conceptual design of OIH allows the use of custom data models and integration flows of such data between multiple ISVs via connectors. An example of such data is customer data. In a simplified scenario without a data hub, a tenant can define which ISV should be primary or leading system for a specific data model (in this case – customer data). This could mean, that this ISV could be in theory the resource provider for customer data. This leads to an assumption, that we may not have a centralized resource provider without a data hub. Each ISV could be granted the privilege of a resource provider. Each caller trying to access such data must provide a valid access token established by the identity provider. An ISV connector may require a Resource API as part of it's SDK to be able to access and validate tokens.
 **TBD: conceptual design and analysis of federated identites.**



 ## Machine-to-Machine Authentication/Authorization

 A machine-to-machine authorization is when the client makes calls to the Resource Server (i.e. the API) on its own behalf.
 For situations like this where there is no user interaction involved, the Client Credentials Grant is ideal. With Client Credentials Grant (defined in [RFC 6749, section 4.4](https://tools.ietf.org/html/rfc6749#section-4.4)) a Client can directly request an access_token from the Authorization Server by using its Client Credentials (a Client Id and a Client Secret). Instead of identifying a Resource Owner, this token will represent the Client itself.
 See: https://auth0.com/docs/architecture-scenarios/application/server-api/part-1


 ## Challenges

 1. Multiple Services are using the same OAuth2 Access Token. One Service uses the Refresh Token which creates a new Access Token and invalidates the previous token. How should the services handle this?
