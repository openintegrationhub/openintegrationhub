
---

**Creator:** Philipp ([@philecs](github.com/philecs)), Cloud Ecosystem e.V.; Hansjörg ([@hschmidthh](github.com/hschmidthh)), Wice GmbH <br>
**Last Modified:** 30.01.2019 <br>
**Last Modifier:** Selim ([@sachmerz](github.com/sachmerz)) <br>
**Version:** 0.6  <br>

---

<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Introduction](#Introduction)
- [Description](#Description)
  - [Purpose of the Microservice Meta Data Repository](#Purpose-of-the-Microservice-Meta-Data-Repository)
- [Technologies used](#Technologies-used)
- [Service Implementation](#Service-Implementation)
- [Requirements](#Requirements)
- [Conceptional Elaborations](#Conceptional-Elaborations)
  - [Basic Version](#Basic-Version)
    - [Model Structure](#Model-Structure)
      - [Domain Object](#Domain-Object)
      - [Model Object](#Model-Object)
- [Open questions / Discussion](#Open-questions--Discussion)
  - [How does a transformer pass/reference the model from metadata repository](#How-does-a-transformer-passreference-the-model-from-metadata-repository)
  - [Where is the transfomer output validated](#Where-is-the-transfomer-output-validated)
  - [_oihdatarecord_](#oihdatarecord)
- [User Stories](#User-Stories)

<!-- /TOC -->
# Introduction

The meta data repository is responsible for storing domains and their master data models. The models stored within this service are consulted for different tasks such as data validation. The meta models are also used by the transformer to map the incoming data onto the Open Integration Hub standard.

In addition, this service also manages the _oihdatarecord_ and concatenates it with the master data models.

# Description

## Purpose of the Microservice Meta Data Repository

If we talk about metadata in this context, we mean the description of the domains and their corresponding Master Data Models. An OIH Master Data Model (OMDM) describes the data of a certain domain in a depth which is sufficient enough to map and synchronize the specific data of multiple applications in that domain. The meta data delivers all the information a user or customer needs to work with data within a specific domain.

The domain models are specified by special workgroups. Please see the specific domain model repository for further informations on a domain and its master data model.

# Technologies used

For storing the meta data this service could use MongoDB. We will use Mongoose for object modeling. Mongoose is built on top of the official MongoDB Node.js driver. For documenting the API we will use the SwaggerUI.

This is a common technology stack and widely used inside the OIH.

# Service Implementation

**Framework Part:** Tbd

**Reference Implementation:** [meta data repository](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/meta-data-repository)

# Requirements

Some required functionalities of the meta data service can be derived from the already designed [Smart Data Framework API](http://35.198.133.5/api-docs/):

- Create a new domain
- Create a new master data model for a domain
- Retrieve a list of all domains for an authenticated user
- Retrieve a specific domain
- Retrieve a list of all model for an authenticated user
- Retrieve a specific model
- Retrieve all models for a specific domain for an authenticated user
- Update a domain
- Update a master data model
- Delete an existing domain (and all relating models)
- Delete an existing master data model
- Add the _oihdatarecord_ schema to a master data model when the model is requested

For some user stories see section [user stories](#user-stories).

# Conceptional Elaborations

## Basic Version

### Model Structure

As aforementioned the service is mainly responsible for storing meta models and domains. In order to unify the meta data to describe domains and models we need a model structure for both objects.

#### Domain Object

The domain object is responsible describing the domain itself. Thus, the following object structure is proposed:

```JSON
{  
  "$schema":"http://json-schema.org/draft-06/schema#",
  "$id":"http://json-schema.org/draft-06/schema#",
  "title":"Domain object description",
  "properties":{  
    "id":{  
      "type":"string",
      "description":"Unique identifier of the domain",
      "examples":[  
        1
      ]
    },
    "name":{  
      "type":"string",
      "description":"Name of the domain",
      "examples":[  
        "products"
      ]
    },
    "description":{  
      "type":"string",
      "description":"Short description of the domain",
      "examples":[  
        "This domain includes all product related models"
      ]
    },
    "owners":{  
      "type":"array",
      "description":"List of owners, who have access to this domain",
      "items": {
        "properties": {
      "id": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
      },
      "examples":[  
        {
      "id": "5bffec99a43c7f3ca95b09e6",
      "type": "tenant"
    }
      ]
    }
  }
}
```

#### Model Object

The model object is responsible for describing the meta model and should have a reference to the superordinated domain.
Therefore, the following structure is supposed:

```JSON
{  
  "$schema":"http://json-schema.org/draft-06/schema#",
  "$id":"http://json-schema.org/draft-06/schema#",
  "title":"Domain object description",
  "properties":{  
    "id":{  
      "type":"string",
      "description":"Unique identifier of the model",
      "examples":[  
        "13"
      ]
    },
    "domaindId":{  
      "type":"string",
      "description":"Unique identifier of the domain the model belongs to",
      "examples":[  
        "1"
      ]
    },
    "description":{  
      "type":"string",
      "description":"Short description of the model",
      "examples":[  
        "Master Data Model Products v1"
      ]
    },
    "owners":{  
      "type":"array",
      "description":"List of owners, who have access to this domain",
      "items": {
        "properties": {
      "id": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
      },
      "examples":[  
        {
      "id": "5bffec99a43c7f3ca95b09e6",
      "type": "tenant"
    }
      ]
    },
    "model":{  
      "type":"object",
      "description":"A JSON schema of the actual model",
      "examples":[  
        {  
          "$schema":"http://json-schema.org/schema#",
          "$id":"https://github.com/openintegrationhub/Data-and-Domain-Models/blob/master/src/main/schema/addresses/personV2.json",
          "title":"Person",
          "description":"Describes a natural person",
          "type":"object",
          "allOf":[  
            {  
              "$ref":"../oih-data-record.json"
            }
          ],
          "properties":{  
            "title":{  
              "type":"string",
              "description":"Title of the person",
              "examples":[  
                "Dr."
              ]
            },
            "salutation":{  
              "type":"string",
              "description":"Salutation of the person",
              "examples":[  
                "Mr."
              ]
            },
            "firstName":{  
              "type":"string",
              "description":"Given name of the person",
              "examples":[  
                "Max"
              ]
            }
          }
        }
      ]
    }
  }
}
```

# Open questions / Discussion

## How does a transformer pass/reference the model from metadata repository

For each transformer in a flow, the user could define which domain + models should be used. When a transformer creates an output how does it reference the exact model representing the data? The transformer could support multiple models, but in order for OIH to validate and process the output, it needs at least to know which model matches which output. Are models named, e.g. **person** and the domain is preselected by the user, when configuring the transfomer?

The [Master-Data-Model document](https://github.com/openintegrationhub/Data-and-Domain-Models/tree/master/MasterDataModels#json-schema) defines following requirement:
> for every sub-model of an OMDM there must be a seperate JSON schema describing the entity or aggregate.
Can a **person** be a sub-model of **addresses** with a unique URI?

## Where is the transfomer output validated

- Done by a separate validator component or metadata repository?

## _oihdatarecord_

In order for the transformer to embed the _oihdatarecord_ into the model via **allOf**, it needs the reference/uri of the _oihdatarecord_, e.g. env vars.

# User Stories

|User Story Id| User Story |
|:---| :--- |
|uMs-meDa1|As an OIH operator I want to upload new versions of a master data model, so that I always the newest model version is stored in my OIH instance |
|uMs-meDa2|As an OIH operator I want to delete existing models, so that only the newest model version is stored |
|uMs-meDa3|As a customer I want to upload new master data models, so that I can choose from a variety of models for a domain |
|uMs-meDa4|As a customer or OIH operator I want to upload new domains, so that I can operate in further domains |
|uMs-meDa5|As a customer I want to retrieve a list of all my domains, to get an overview of all domains I can operate with |
|uMs-meDa6|As a customer or OIH operator I want to retrieve information about a specific domain, so that I can see information about the domain and all its models |
|uMs-meDa7|As an OIH operator I want to retrieve a list of all domain models available for a specific user, so that the user is able to choose which model he/she wants to use |
|uMs-meDa8|As an OIH operator I want to retrieve a specific model, so that I can generate a dynamic mapping interface that I can provide my customer |
|uMs-meDa9|As a customer I want to retrieve a specific model, so that I know the structure of the model and write a mapping between my data model and the master data model |
|uMs-meDa10|As an OIH operator I want to retrieve a specific model, so that I can validate the output of a transformer |
|uMs-meDa11|As an OIH operator I want to be able to store multiple versions of one model, so that backward compatibility is ensured |
|uMs-meDa12|As an OIH operator I want that a user can only see the domains he is authorized for |
|uMs-meDa13|As an OIH operator I want that a user can only see the models he is authorized for |
|uMs-meDa14|As an OIH operator I want that a user can only delete domains he is authorized for |
|uMs-meDa15|As an OIH operator I want that a user can only delete models he is authorized for |
