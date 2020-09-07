# Status
accepted Alternative 1

# Context
There will be a REST API provided by the Smart Data Framework that can be used by connectors of ISV apps for the
propagation of updates. It has not yet been decided on the degree of genericity of this API (completely generic vs.
domain specific).

# Alternatives

## Alternative "Generic REST API for update propagation"
The API for update propagation will be completely generic. There will be a "data" resource that can be used to post changes to arbitrary
json data (compare to https://github.com/openintegrationhub/Architecture/blob/master/SmartDataFramework/oih-sdf-api-0.0.1.yaml).

### Decision
The decision was made in favor of Alternative 1.

### Consequences
Pros:
- Generic one-size-fits-all solution
- Small and lightweight API

Cons:
- Deserialization of JSON data seems to be more complex in particular if there is no object type given in the objects (this is in particular true if inheritance is supported)
- Generic code is often much harder to implement and maintain than code that is more domain-specific
- API less intuitive and easy-to-read than alternative 2
- Unclear: Can this API alternative really be considered RESTful ?

## Alternative "Domain-specific REST APIs for update propagation"
The API for update propagation will be completely domain-specific. There will be extra resources for the different 
aggregates, entities (?), value objects (?) that can be updated by the standard REST methods (POST, PUT, DELETE, PATCH).

**Example: Update to single ressource** (Surname of a contact has changed)

**HTTP Request:**

```
PATCH /contacts/447d9088-6e54-11e8-adc0-fa7ae01bbebc
```

**Body:**

```json
{
    "lastName": "Kuhn"
}
``` 

**Example: Submit bulk updates**

**HTTP Request:**

```
PATCH /contacts
```

**Body:**

```json
[
  {
    "id": "d10b642c-6e76-11e8-adc0-fa7ae01bbebc",
    "readVersion": 100,
    
    "operationType": "delete",
    "operationTime": "2007-04-05T12:30-02:00",
    "operationOriginAppUuid": "com.snazzycontacts.SnazzyContacts", 
    
    "securityUserUuid": "bc9c46fe-238b-11e8-b467-0ed5f89f718b",
    "securityUserRole": "some-role",
    
    "contact-diff": {}
  }, 
  {
    "id": "7d2817e6-6e77-11e8-adc0-fa7ae01bbebc",
    "readVersion": 5,
    
    "operationType": "update",
    "operationTime": "2007-04-05T12:30-02:00",
    "operationOriginAppUuid": "com.snazzycontacts.SnazzyContacts", 
    
    "securityUserUuid": "bc9c46fe-238b-11e8-b467-0ed5f89f718b",
    "securityUserRole": "some-role",
      
    "contact-diff": {
      "lastName": "Kuhn"
    }
  }
]
``` 

**Example: Get remote updates**

**HTTP Request:**

```
GET /contacts/update-events
```

**Response Body:**

```json
[
  {
    "id": "d10b642c-6e76-11e8-adc0-fa7ae01bbebc",
    "readVersion": 100,
    "version": 101,
    
    "operationType": "delete",
    "operationTime": "2007-04-05T12:30-02:00",
    "operationOriginAppUuid": "com.snazzycontacts.SnazzyContacts", 
    
    "securityUserUuid": "bc9c46fe-238b-11e8-b467-0ed5f89f718b",
    "securityUserRole": "some-role",
    
    "contact-diff": {},
    
    "links": [
        {
            "rel": "self",
            "uri": "http://localhost:8080/contacts/update-events/2fd98208-4791-4e6b-a131-85f57a0e2443"
        },
        {
            "rel": "contact",
            "uri": "http://localhost:8080/contacts/d10b642c-6e76-11e8-adc0-fa7ae01bbebc"
        }
    ]
  }, 
  {
    "id": "7d2817e6-6e77-11e8-adc0-fa7ae01bbebc",
    "readVersion": 5,
    "version": 6,
    
    "operationType": "update",
    "operationTime": "2007-04-05T12:30-02:00",
    "operationOriginAppUuid": "com.snazzycontacts.SnazzyContacts", 
    
    "securityUserUuid": "bc9c46fe-238b-11e8-b467-0ed5f89f718b",
    "securityUserRole": "some-role",
      
    "contact-diff": {
      "lastName": "Kuhn"
    },
      
    "links": [
        {
            "rel": "self",
            "uri": "http://localhost:8080/contacts/update-events/fb3e6d75-b265-423c-9299-cdc02343b7ac"
        },
        {
            "rel": "contact",
            "uri": "http://localhost:8080/contacts/7d2817e6-6e77-11e8-adc0-fa7ae01bbebc"
        }
    ]
  }
]
``` 

**An alternative for submitting bulk updates could be to  directly `POST to /contacts/update-events`. This would even better correspond with the CQRS pattern.**

### Decision
The decision was made in favor of Alternative 1.

### Consequences
Pros:
- Easy to understand and easy to read
- REST APIs could be generated out of master data models
- Validation of data delivered in the message body is possible and straight-forward
- API is RESTful

Cons:
- The implementation of the update propagation component in the connector has to be (at least to a certain degree) also to be domain-specific
- Overall the API will be larger in comparison to alternative 1
 
