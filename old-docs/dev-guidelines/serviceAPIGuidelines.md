# Introduction

Open Integration Hub architecture centers around decoupled microservices that provide functionality via APIs. In most cases these APIs are RESTful using JSON as payload. This document is the guideline for OIH service APIs. The goal is to make all OIH APIs look like they were written by the same author.

The API is described using [Open API Spec](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md) v3.0.2 or higher.

## Conventions Used in These Guidelines

The requirement level keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" used in this document (case insensitive) are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

# JSON Guidelines

## Must: Property names must be always camelCase

## Should: Array names should be pluralized

## Must: Boolean property values must not be null

## Should: Empty array values should not be null

Empty array values can unambiguously be represented as the empty list, []. The following example demonstrates a valid empty array

```json
{
    "orders": []
}
```

The following example demonstrates how arrays must not be returned:

```json
{
    "orders": null
}
```

## Should: Date property values should conform to [RFC 3339](http://tools.ietf.org/html/rfc3339#section-5.6)

# API Naming

## Must: Use lowercase separate words with hyphens for Path Segments

For example:

````json
/auth-clients/{client-id}
````

## Must: Use snake_case for Query Parameters

For example:

````json
id, flow_id, secret_id
````

## May: Use square brackets for a group of related Query Parameters 

For example:

````json
page[number]=2&page[size]=10
````

## Must: Pluralize Resource Names

````json
/flows
/auth-clients
/secrets
````

## Must: Avoid Trailing Slashes

The trailing slash must not have specific semantics. Resource paths must deliver the same results whether they have the trailing slash or not.

# Payload Structure

## Must: Root object may contain data and meta only

````json
{
    "data": {}, 
    "meta": {} 
}
````

Whereby

* data: contains the primary payload. Maybe either a single object or an array
* meta: a meta object that contains non-standard meta-information

## Must: Error message content format must be json

The format of the content of any every error message must be `application/json`. Response must be of type `object`.

The following structure must be used:

```js
{
  "errors": [
    {
      "message": "Required error message",
      "code": "Optional error code"
    }
  ]
}
```

As mentioned in the [http requests section](#http-requests) request have to return certain status codes. The status codes are based on [the official list of HTTP status codes](http://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml). The `errors array` should only be returned if the request returns with an error code (i.e. 4xx or 5xx).

## May: Any object may have many owners

Any object may have owners. For example a `Flow` may belong to a `User`. Regardless of whether the object has a single owner or multiple, the owners must be defined as an `array` as shown below:

````yaml
    MutableFlow:
      type: "object"
      required:
        - "owners"
      properties:
        owners:
          type: array
          items:
            $ref: "#/components/schemas/Owner"
````

Here is the definion of the `Owner` object:

````yaml
    Owner:
      type: object
      required:
        - id
        - type
      properties:
        id:
          type: string
          description: External id of the owner
        type:
          type: string
          description: Type to discriminate owner's type
````

# HTTP Requests

## Must: Use HTTP Methods Correctly

Be compliant with the standardized HTTP method semantics summarized as follows:

### GET

* GET requests are used to read either a single or a collection resource. GET with Body is forbidden.
* GET requests for individual resources will usually generate a 404 if the resource does not exist
* GET requests for collection resources may return either 200 (if the collection is empty) or 404 (if the collection does not exist)
* GET requests must NOT have a request body payload

### POST

POST requests are idiomatically used to create single resources on a collection resource endpoint.

* The response to a **POST**/**PUT**/**PATCH** request that creates or modifies an object should contain the resulting new object. The format of the response should be identical to what the service would return when **GET**ting the same object i.e. featuring the data and meta properties, e.g.:

```json
{
  "data": {
    "name": "My Flow",
    "description": "This flow takes actions at regular invervals based on a set timer.",
    "graph": {
      "nodes": [
        {
          "id": "step_1",
          "componentId": "5ca5c44c187c040010a9bb8b",
        }
      ]
    }
  }
}
meta: {}
```

* The request body of a **POST**/**PUT**/**PATCH** request should only contain the plain object itself, without further wrapping it inside a data object or similar. 

  **Correct Example:**

  ```json
  {
    "name": "My Flow",
    "description": "This flow takes actions at regular invervals based on a set timer.",
    "graph": {
      "nodes": [
        {
          "id": "step_1",
          "componentId": "5ca5c44c187c040010a9bb8b",
        }
      ]
    }
  }
  ```

  **Incorrect Example:**

  ```json
  {
  "data": {
    "name": "string",
    "description": "string",
    "value": {
      "$id": "address",
      "required": [
        "street_address",
  ```

### PUT

PUT requests are used to update (in rare cases to create) entire resources - single or collection resources.

* PUT requests are usually applied to single resources, and not to collection resources, as this would imply replacing the entire collection
* PUT requests are usually robust against non-existence of resources by implicitly creating before updating
on successful PUT requests, the server will replace the entire resource addressed by the URL with the representation passed in the payload (subsequent reads will deliver the same payload)
* successful PUT requests will usually generate 200 or 204 (if the resource was updated - with or without actual content returned), and 201 (if the resource was created)

### PATCH

PATCH requests are used to update parts of single resources, i.e. where only a specific subset of resource fields should be replaced.

* PATCH requests are usually applied to single resources as patching entire collection is challenging
* PATCH requests are usually not robust against non-existence of resource instances on successful PATCH requests, the server will update parts of the resource addressed by the URL as defined by the change request in the payload
* successful PATCH requests will usually generate 200 or 204 (if resources have been updated with or without updated content returned)

### DELETE

DELETE requests are used to delete resources. The semantic is best described as "please delete the resource identified by the URL".

* DELETE requests are usually applied to single resources, not on collection resources, as this would imply deleting the entire collection
* successful DELETE requests will usually generate 200 (if the deleted resource is returned) or 204 (if no content is returned)
* failed DELETE requests will usually generate 404 (if the resource cannot be found)

# Schemas

## Must: Define mutable & immutable versions of the same object

Mutable objects define properties that may be changed by clients through the API. The are to be used in `POST`, `PATCH` and `PUT` resources. Immutable objects are contain additionally properties maintained by the server, such as `id` or any time related properties. Immutable objects are to be used in `GET` resources.

Here is an example of a mutable object:

````yaml
    MutableFlow:
      type: "object"
      required:
        - "name"
        - "type"
      properties:
        name:
          type: "string"
          example: "My Flow"
        description:
          type: "string"
          example: "My Flow"
        type:
          type: "string"
          description: "Flow type"
          enum:
          - "ordinary"
          - "realtime"
````

The immutable version of a `Flow` is an extension of `MutableFlow`:

````yaml
    Flow:
      allOf:
        - $ref: "#/components/schemas/MutableFlow"
        - type: "object"
          required:
            - "id"
            - "status"
            - "createdAt"
            - "updatedAt"
          properties:
            id:
              type: "string"
            createdAt:
              type: string
              description: Flow creation time
              format: date-time
            updatedAt:
              type: string
              description: Flow update time
              format: date-time
````

## Must: Not to contribute to schema explosion by defining schemas for collections of objects

If a resource responds with an array, it must define the `array` in the resource definition locally and not contribute to a schema explosion. The following example demonstrates a valid definition:

````yaml
      responses:
        200:
          description: "successful operation"
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  data:
                    type: "array"
                    items:
                      $ref: "#/components/schemas/Flow"
                  meta:
                    $ref: "#/components/schemas/Meta"
````

While the following definition is forbidden:

````yaml
      responses:
        200:
          description: "successful operation"
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  data:
                    $ref: "#/components/schemas/ArrayOfFlows"
                  meta:
                    $ref: "#/components/schemas/Meta"
````

# Pagination

## Must: Support Pagination

Any access to lists of data items must support pagination to protect the service against overload. Here is an example of pagination properties

````json
{
    "data": {},
    "meta": {
        "page": 1,
        "perPage": 10,
        "total": 123,
        "totalPages": 13
    }
}
````

Whereby:

* page: the current page whereby we use 1-based numbering
* perPage: number of objects per page
* total: total number of objects
* totalPages: total number of pages

The query parameters for pagingations to be used by API clients:

* page[number]: number of page the client wishes to receive. Corresponds to `meta.page` defined above. For example `page[number]=2` tells the server to return the 2nd page.
* page[size]: the size of the requested page. Corresponds to `meta.perPage` defined above. For example `page[size]=20` tells the server to return the 20 objects per page page.

Please use the following schema in your API definition:

````yaml
    Meta:
      type: object
      properties:
        page:
          type: integer
          description: Current page (1-based numbering)
        perPage:
          type: integer
          description: Number of objects per page
        total:
          type: integer
          description: Total number of objects
        totalPages:
          type: integer
          description: Total number of pages
````

Here is an example how to use `Meta` in your reponse definition:

````yaml
     responses:
        200:
          description: "successful operation"
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  data:
                    type: "array"
                    items:
                      $ref: "#/components/schemas/Flow"
                  meta:
                    $ref: "#/components/schemas/Meta"
````

# Sorting

## May: A server may choose to support requests to sort resource collections according to one or more criteria

If so, the `sort` Query Parameter must be used. For example, sorting by the property `updatedAt` would be accomplished as follows:

````json
/flows?sort=updatedAt
````

## Must: The sort order for each sort field must be ascending

If sorting is supported, the default sort order is ascending. To invert the sorting order, the property must be prefixed with a minus (`-`). For example:

````json
/flows?sort=-updatedAt
````
