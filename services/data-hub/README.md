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

## Environment variables

## Import & Merge

### Initial situation

The initial import of existing data from different sources poses some problems. The focus of this concept is the determination of same identities for data sets from different sources. As an example, it should be shown here through the context of “contact details”.

If you look at the schema for specific data records from one source and compare it with the schema of another, you can already see differences in essential fields such as "forename" and "name" or "lastname" and "surename".

Furthermore, the redundant storage of data sets - possibly maintained independently by hand - can cause orthographic errors, which in turn lead to different values. Incorrect fields may also have been selected for entering a value.

While the different assignment of field names can be solved by individually mapping known structures to a uniform data format, a solution for the second sub-problem is somewhat more difficult.

### MinHash to determine common identity

A possible solution can be given by using the so-called "MinHash" procedure (Broder 1997). See https://web.archive.org/web/20150131043133/http://gatekeeper.dec.com/ftp/pub/dec/SRC/publications/broder/positano-final-wpnums.pdf

By standardizing the data and comparing individual values ​​at random, the probability of a common identity of two different data sets can be determined. Based on this probability, the affected data sets can be combined automatically if necessary.

### Objectives of a prototype

So that the effectiveness of the "MinHash" procedure can be tested, Data Hub Service is expanded to include a specific import interface and the algorithm is incorporated in the form of a JS implementation.
See https://github.com/duhaime/minhash

After a basic implementation is done, this functionality should be challenged on the basis of various data sets and optimized in a further step so that “false positives” only occur to a minimal extent when determining the identity.

### General

| Name         | Description                   |
| ------------ | ----------------------------- |
| IAM_TOKEN    | Token of the service account. |
| LOG_LEVEL    | Log level for logger.         |
| MONGODB_URI  | MongoDB connection string.    |
| RABBITMQ_URI | RabbitMQ connection string.   |
| PORT         | Port for HTTP interface.      |
