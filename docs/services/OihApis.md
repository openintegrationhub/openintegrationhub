# Proposal

The OIH platform can be managed through corresponding REST-APIs. The following list proposes a list of endpoints/methods from a marketplace perspective.

We assume, that there is at least one **Master ServiceAccount** which authenticates using a simple authorization like *BasicAuth* or using a *Bearer Token* without expiration date.

Master Account can also create *tenants*, *vendors* and their respective *users*. Theoretically, we could have a full authentication mechanism to allow users to login if they know their credentials. In a marketplace scenario, the users login only into the Basaas platform and do not need to memorize any OIH credentials. In order for these users to be able to communicate with OIH using only their Basaas Accounts, there are to ways to grant a secure access

- Basaas MasterAccount retrieves an access_token for current user and all further communication is done between the user and OIH using this very access_token
- The OIH authorization server verifies through Basaas authorization server that the current user is logged in and provides an access_token

The latter can be defined generically allowing the OIH use an external authentication/authorization server.



## API description

This is the first version and should be documented with Swagger instead of markdown.

Currently, we view only *tenant* and *vendor* routes. Additional routes may be added.


### 1. Entities & Users

| Method | Route | Params/Body | Returns | Access Control | Comment |
|--------|--------|--------|--------|--------|--------|
|POST    |/tenants  |body: tenant data|  tenantId | Master ServiceAccount | Create a tenant  |
|PUT |/tenants/:id| id: tenantId, body: tenant data  | modified tenant data |Master ServiceAccount|Modify the tenant data completely|
|PATCH |/tenants/:id| id: tenantId, body: tenant data  | modified tenant data fields |Master ServiceAccount|Modify only the given tenant data|
|POST|/tenants/:id/users|body: user data, userId|Master ServiceAccount|Tenant Admin must provide Bearer Token|similarly to tenant, the user data can be modified through PUT and PATCH methods|
|GET|/tenants/:tenantId/users/:userId/access-token|OAuth2 Access and Refresh Tokens|Master ServiceAccount||For the scenario when the marketplace fetches user's access_token|
|POST|/vendors|body: vendor data|vendorId|Master ServiceAccount|Create a new vendor|
|POST|/vendors/:vendorId/users|body: user data	userId|Master ServiceAccount|Vendor Admin|Create a new vendor user|


### 2. Connectors

| Method | Route | Params/Body | Returns | Access Control | Comment |
|--------|--------|--------|--------|--------|--------|
|POST|/vendors/:vendorId/adapters|<ul><li>meta data</li><li>description</li><li>versionKey</li><li>adapter binary</li></ul>|adapterId|Vendor Admin|Create a new adapter|
|POST|/vendors/:vendorId/transformators|<ul><li>meta data</li><li>description</li><li>versionKey</li><li>transformator binary</li></ul>|transformatorId|Vendor Admin|Create a new transformator|
|GET|/vendors/:vendorId/transformators||[Transformator]|Vendor Admin|Get the list of transformators|
|POST|/vendors/:vendorId/connectors|<ul><li>meta data</li><li>description</li><li>versionKey</li><li>adapterId / version</li><li>transformatorId / version</li></ul>|connectorId|Vendor Admin|Vendor can create a new connector. <br />Define which adapter and transformator versions make up the connector + meta data|
|GET|/vendors/:vendorId/connectors/:connectorId/status||current status of connector liveliness and error rates|Vendor Admin|



### 3. Integration Flows

| Method | Route | Params/Body | Returns | Access Control | Comment |
|--------|--------|--------|--------|--------|--------|
|POST|/tenants/:tenantId/secrets|<ul><li>meta data</li><li>type</li><li>scope (private or org)</li><li>data (base64)</li></ul>||Tenant Admin|Define a secret and limit the access either to tenant organization or only for current user|
|POST|/tenants/:tenantId/integration-flows|<ul><li>meta data</li><li>description</li><li>versionKey</li><li>integrationSource</li><li>integrationTarget</li><li>secrets</li><li>scope</li></ul>|integrationFlowId|Tenant Admin|Create a new integration flow<br />Use PUT or PATCH to modify<br />GET with id to get info.<br />private flows are only visible to current user|
|GET|/tenants/:tenantId/integration-flows/:intFlowId/status|||Tenant Admin<br />Master ServiceAccount|Get the status of an integration flow|
|POST|/tenants/:tenantId/integration-flows/:intFlowId/trigger|action: START,PAUSE,SUSPEND,SCALE<br />values: ...||Tenant Admin<br />Master ServiceAccount|Master can stop or suspend a faulty integration flow|






### 4. Reports & Analytics (TODO)

| Method | Route | Params/Body | Returns | Access Control | Comment |
|--------|--------|--------|--------|--------|--------|
|GET|/tenants/:tenantId/integration-flows/:intFlowId/status|||Tenant Admin|Get the status of an integration flow|
|GET|/tenants/:tenantId/integration-flows||current status of integration flows, connector livelinesses, error rates, etc|Tenant Admin|Reports, Overview|









