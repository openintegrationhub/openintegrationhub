# Introduction

Open Integration Hub architecture centers around decoupled microservices that provide functionality via APIs. In most cases these APIs are RESTful using JSON as payload. This document is the guideline for OIH service APIs. The goal is to make all OIH APIs look like they were written by the same author.

## Conventions Used in These Guidelines
The requirement level keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" used in this document (case insensitive) are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

# JSON Guidelines

## Must: Property names must be always camelCase

## Should: Array names should be pluralized

## Must: Boolean property values must not be null

## Should: Empty array values should not be null

Empty array values can unambiguously be represented as the empty list, []

## Should: Date property values should conform to [RFC 3339](http://tools.ietf.org/html/rfc3339#section-5.6)

# API Naming

## Must: Use lowercase separate words with hyphens for Path Segments

For example:

````
/auth-clients/{client-id}
````

## Must: Use snake_case for Query Parameters

For example:

````
id, flow_id, secret_id
````

## May: Use square brackets for a group of related Query Parameters 

For example:

````
page[number]=2&page[size]=10
````

## Must: Pluralize Resource Names

````
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
        "totalPages": 2
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
