
# Access Control Management

## Summary
This is a summary about all different types of Access Control and illustrates the Pros & Cons of access control models which are suitable for OIH. Literature links will be provided at the end of the page. For every IAM system the Access Control is a crucial part beside the Identity Management (User Management). 

**Access Control delivers four services**

* Authorization
* Authentication
* Access approval
* Accountability


## Access Control Models
There is a huge list for different types of Access Control Models, for example:

Here the list of different Access Control Models   
Basic (Department of Defense 1960 / 1970):  

* MAC (Mandatory Access Control)
* DAC (Discretionary Access Control) 

**Common**:

* RBAC (Role Based Access Control)
* ABAC (Attribute Based Access Control)
    * policy-based access control (PBAC)
    * claims-based access control (CBAC)
* IBAC (Identity Based Access Control)

**Specials**:

* HBAC (History Based Access Control)
* OrBAC (Organization Based Access Control)
* IBAC (Identity Based Access Control)
* RAC (Rule Based Access Control)
* Responsibility Based Access control


In this Document we will focus on models which are common in Microservices and Web Application Use cases.



### Role Based Access Control (RBAC)

This Model uses individual designed roles to decide about access. The design of the roles requires a fundamental analysis of the target organization and/or use cases. For Example a normal organization structure (simplified without hierarchy for example purpose):  C-Level, Sales, Controlling, User, Administrator

**Advantages**:

* Easy to map org structure to Access Roles
* Well known handling in use and administration
* Widespread usage 

**Disadvantages**:

* Documentation of roles needs to be on point
* Multi-tenancy is difficult to implement and makes administration much more complex
* User could have different groups which contain different Roles which overrules each other
* In worst case: introduce new roles which contains subsets access privileges of multiple other roles


### Attribute Based Access Control (ABAC)
This model is based on policies which are related on combined attributes (Subject attributes, Resource attributes, Environment attributes, Action attributes). The main difference between ABAC and RBAC is that policies are not needed to be pre-defined und could be created when a use case (feature) is created, because the needed attributes are already in place. ABAC provides dynamic, context-aware and risk-intelligent access control.



**Core architecture**:

* PEP: Policy Enforcement Point is responsible for protecting apps/data. PEP inspects request for access and generates an authorization request for PDP. 
* PDP: Policy Decision Point is the logic behind ABAC and decides if the authorization request is approved or not. Therefore it uses all given information and missing information where requested from PIP.
* PIP: Policy Information Point provides Information from external resources like LDAP and DB

**Policies example**:

1. A user can view a document if the document is in the same department as the user
2. A user can edit a document if they are the owner and if the document is in draft mode
3. Deny access before 9am


**Advantages**:

* Easy to map org structure to attributes
* Widespread usage in modern technologies
* Multi-tenancy could be handled via attributes

**Disadvantages**:

* More complex implementation because of decision making to gather infomation
 


# Access control in OIH

Following ressource require a sophisticated access control:

* Global (limited to a single OIH instance)
	* OIHConfiguration
	* ConnectorList
	* DataModel
* Organization
	* OrganizationPreferences
	* Data
		* _Data in context of Smart Data Framework_
    * Groups
	    * _All members of an organization also belong to a defaultOrgGroup_
    * Users
    * IntegrationFlows
    	* _Can belong to any number of groups (defaultOrgGroup = accessible to any member of the organization)_
    	* _Can use global or organization connectors_
    * Credentials
    	* _Can be private (belong to an individual) or belong to a group (defaultOrgGroup = accessible to any member of the organization)_
    * Teams
    * Organization connectors
	    * _Can only be modified by team members_
* Connector
	* _Can be used by other organizations if set to public_


![OIH resources](./Assets/oih-resources-access.png)


## OIH Roles

We specify following roles in OIH, which can be viewed as presets containing specific attributes for access control. A role based model is easier to comprehend for users. Nonetheless, at the core of OIH the access control should be based on ABAC.
This list is based on current roles and privileges of elastic.io platform.


#### Global roles
**OIHAdmin**
Can be a user using the the UI or an external service like Basaas marketplace.

Privileges:
* Configure the OIH instance
	* manage Master Data Model
	* manage connector portfolio
* Manage organizations (create/edit/etc)
* Manage users

#### Organization roles

All ressources are limited to current organization, unless it is specified otherwise. Additionally, each role with a privilege to manage a ressource (e.g. credentials, flows) can do so either in context of the organization or private. Create private credentials limits the access to these credentials only to the author. All other users can only see the name, but not the contents of these credentials.

**OrganizationAdmin**

Privileges:
* Manage organization data
* Manage organization users and groups
* Manage connectors
* Create teams and connector repositories


**Integrator**

Privileges:
* Create and manage organization integration flows
* Manage credentials
	* Can create private credentials and private integration flows in order to test the components 
* Can be part of developer teams
	* Can commit to [integration component repository](https://github.com/openintegrationhub/Microservices/blob/master/RepositoryManagement/IntegrationComponentRepository.md)



**Guest**

Privileges:
* Can view active integration flows



## Attribute enhanced RBAC in OIH

We prefer this approach because it combines the advatanges of both RBAC and ABAC. This is elaborated in more detail in following papers [Attributes Enhanced Role-Based Access Control Model](http://orbit.dtu.dk/files/110988163/AERBAC_TrustBus_20150618_.pdf) and [Adding Attributes to Role-Based Access Control](https://csrc.nist.gov/publications/detail/journal-article/2010/adding-attributes-to-role-based-access-control)

Inspired by the library [accesscontrol](https://github.com/onury/accesscontrol), the main idea is to allow roles, which can use inheritance and can additionally be enhanced through attributes.

Example code:

```javascript

const ac = new AccessControl();
ac.grant('user')    // define a role
    .createOwn('credentials')
    .deleteOwn('credentials')
    .readAny('integrationFlow', ['name'])	// explicitly defined attributes
  .grant('orgAdmin')                // switch to another role without breaking the chain
    .extend('user')                 // inherit role capabilities
    .updateAny('integrationFlow')
    .deleteAny('integrationFlow');

const permission = ac.can('user').createOwn('credentials');
console.log(permission.granted);    // —> true
console.log(permission.attributes); // —> ['*'] (all attributes)
console.log(ac.can('user').readAny('integrationFlow').attributes); // —> ['name']

permission = ac.can('admin').updateAny('integrationFlow');
console.log(permission.granted);    // —> true
console.log(permission.attributes); // —> ['*'] (all attributes)

```

The upper example only covers permission checks when accessing a resource.
Ideally, roles and thus RBAC would suffice, but using only RBAC could limit us in the future if new roles with overlapping permissions are introduced.


 
 
 
- - -

 
 
 
**Links to Literature**


https://en.wikipedia.org/wiki/Access_control  
https://www.owasp.org/index.php/Access_Control_Cheat_Sheet#tab=Role_Based_Access_Control__28RBAC_29  
https://www.axiomatics.com/attribute-based-access-control/  
http://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-162.pdf  
http://blog.identityautomation.com/rbac-vs-abac-access-control-models-iam-explained  
https://en.wikipedia.org/wiki/Attribute-based_access_control  
https://en.wikipedia.org/wiki/Discretionary_access_control  
https://en.wikipedia.org/wiki/Mandatory_access_control  
