![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Data Hub

Stores master data records.

## API docs

[http://data-hub.openintegrationhub.com/api-docs](http://data-hub.openintegrationhub.com/api-docs).

## Prerequisites

- MongoDB

## Service Account

This service requires a service account with the following permissions:

- `iam.token.introspect`

## How to build

```docker
docker build -t openintegrationhub/data-hub:latest -f Dockerfile ../../
```

or

```npm
VERSION=latest npm run build:docker
```

## How to deploy

Kubernetes descriptors can be found in the [k8s](./k8s) directory.

## Import & Merge

Find more details [here](./src/minhash-poc/README.md)

## Enrichment & Cleansing

The data hub offers a number of functions in order to help prepare and unify data objects stored in the Data Hub for further processing. This is an asynchronous process applied to all data objects stored by a given user (if not further constrained), and the results will be stored in place as part of these objects. These functions can be reached through the `/data/enrich` endpoint, and configured through an array of functions like so:

```json
{
  "functions":[
    {
      "name":"score",
      "active":true,
      "fields":[
        {
          "key":"firstName",
          "minLength":5,
          "weight":2
        }
      ]
    }
  ]
}
```

Each available funciton has a `name` through which it can be called, and an array of `fields` with which it can be configured. The required and available fields are specific to the desired function.

### List of functions
This is the list of currently available functions. The endpoint is designed to allow for an easy expansions with further functions as needed.

#### Scoring

Through the scoring function, a data object can be assigned a numerical score depending on whether certain fields are present and contain a value. Both the total sum of the score as well as a normalized representation between 1 and 0 will be stored.

- name: `score`
- fields:
    - key: The property key to be checked. In case of a nested property, it can be addressed through dot notation, e.g. `address.city`.
    - weight: The score to be awarded if the assigned key has a value
    - minLength: optional; only awards the score if the value has at least this length
    - maxLength: optional; only awards the score if the value has no more than this length

Result: The awarded score will be saved as part of the object's `enrichtmentResults` key. The total sum of the awarded scores is stored as `enrichtmentResults.score`, and a representation normalized to a range between 0 and 1 will be stored as `enrichtmentResults.normalizedScore`


#### Tagging

Through the tagging function, an object can be assigned a number of string tags depending on whether it fulfills certain preconditions. Due to the potential complexity of the conditions, an extensible library of comparator functions is used, found in the `src/handlers/comparators.ts` file.

- name: `tag`
- fields:
    - comparator: refers by name to a minimal function that compares the argument with the object's content. If this comparator returns true, the tag will be added
    - tag: The string tag to be added to the object if the condition is fulfilled
    - arguments: object passed into the comparator as an argument together with the data object's content.
    - additive: optional; if set to `true`, the applied tags are combined with whatever tags may be present already. Otherwise, any previously added tags are overwritten.

Result: An array of all applied tags is saved as part of the data object's enrichtmentResults key.

#### Transforming

By using a (JSONata expression)[https://jsonata.org/], the format of the data object's content can be transformed entirely. NOTE: This is a destructive operation that changes the content in-place.

- name: `transform`
- fields:
    - expression: A stringified, valid JSONata expression

Result: The result of the expression's evaluation is stored as the data object's `content` key.

#### Deduplicate

By using this function, the data hub will attempt to find potential duplicates among the stored data objects. By default, it will check for objects with exactly identical contents, but can also find objects that are subsets of one another. By default, potential duplicates are noted by their ID, but the function can also be configured to automatically delete them.

- name: `deduplicate`
- fields:
    - autoDeleteDuplicates: optional; If `true`, automatically delete any found duplicates. NOTE: This is a destructive, irreversible operation
    - autoDeleteSubsets: optional; If `true`, will automatically delete any found subsets. NOTE: This is a destructive, irreversible operation
    - additive: optional; If `true`, any already existing entries in the list of known duplicates/subsets will be preserved and newly found ones added to them. Otherwise, they will be reset.
    - mergeRefs: optional; Only applies if either autoDelete is activated. If `true`, will merge any refs in the deleted object to its remaining counterpart

Result: A list of the ids of all found duplicates and subsets will be stored in `enrichtmentResults.knownDuplicates` and `enrichtmentResults.knownSubsets`, respectively



## Environment variables

### General

| Name         | Description                   |
| ------------ | ----------------------------- |
| IAM_TOKEN    | Token of the service account. |
| LOG_LEVEL    | Log level for logger.         |
| MONGODB_URI  | MongoDB connection string.    |
| RABBITMQ_URI | RabbitMQ connection string.   |
| PORT         | Port for HTTP interface.      |
