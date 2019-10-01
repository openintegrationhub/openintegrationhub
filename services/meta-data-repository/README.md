![alpha](https://img.shields.io/badge/Status-Alpha-yellowgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Meta Data Repository (working title / codename: *TBD*)

[Documentation on Swagger Hub](https://app.swaggerhub.com/apis/basaas5/metadata-service/0.0.2)

## Configuration

See the default config in src/config/index.js

The following list contains the environment variables you can set to configure the service:

* **PORT** - Service port, *default*: 3000
* **BASE_URL** - Base URL for Schema endpoint, *default*: 'http://localhost'
* **API_BASE** - API Base, *default*: 'api/v1'
* **IAM_APIBASE** - IAM API Base, *default*: 'http://iam.openintegrationhub.com/api/v1'
* **IAM_TOKEN** - Service token, *default*: 'token'
* **IAM_TOKEN_API** - IAM token endpoint, *default*: 'http://iam.openintegrationhub.com/api/v1/tokens/ephemeral'
* **INTROSPECT_TYPE** - Default token introspect method (basic or oidc), will be used if explicit http header is missing, *default*: 'basic'
* **INTROSPECT_ENDPOINT_BASIC** - URL to basic introspect, *default*: 'http://iam.openintegrationhub.com/api/v1/tokens/introspect'
* **INTROSPECT_ENDPOINT_OIDC** - URL to oidc introspect, *default*: 'https://iam.openintegrationhub.com/op/userinfo'
* **IAM_OIDC_SERVICE_CLIENT_ID** - Oidc client id. *default*: 'id'
* **IAM_OIDC_SERVICE_CLIENT_SECRET** - Oidc client secret, *default*: 3099
* **LOG_NAMESPACE** - Namespace for all emitted logs, *default*: 'meta-data-repository'
* **LOG_LEVEL** - Set global log level, *default*: 'error'
* **RABBITMQ_URI** - RabbitMQ for the OIH event bus; *default*: 'amqp://guest:guest@localhost:5672'
* **MONGODB_CONNECTION** – MongoDB connection string to replica set, *default*: 'mongodb://localhost:27017/meta-data-repository?replicaSet=rs`'
* **DEBUG_MODE** – Get additional debug log, *default*: 'false'
* **PAGINATION_DEFAULT_PAGE** - Set default start page,  *default*: 1
* **PAGINATION_PAGE_SIZE** - Set items per page,  *default*: 30

---

## Event controller

Subscripes

* **iam.tenant.deleted** - Deletes tenant domains and schemas


Publishes

* **metadata.domain.deleted**
* **metadata.schema.created**
* **metadata.schema.modified**
* **metadata.schema.deleted**

---



## Development

Install packages

```zsh
yarn
```

Start local TBD

```zsh
yarn start
```

Watch server and restart after code changes

```zsh
yarn watch
```

Test TBD components

```zsh
yarn test
```

---

## Install (minimal)

In service root directory "openintegrationhub/services/meta-data-repository/"

Setup .env.local

```zsh
tee -a .env.local <<EOF
MONGODB_CONNECTION={MONGODB_CONNECTION}/meta-data-repository
LOG_LEVEL=error
IAM_TOKEN=token
DEBUG_MODE=false
REFRESH_TIMEOUT=600
EXPIRATION_OFFSET=-100
PAGINATION_PAGE_SIZE=10
INTROSPECT_ENDPOINT_BASIC=http://iam.openintegrationhub.com/api/v1/tokens/introspect
EOF
```

Build image

```zsh
docker build . -t oih/meta-data-repository
```

Run container

```zsh
docker run --rm -p 3000:3000 --env-file=".env.local" oih/meta-data-repository
```

Open your browser and connect to http://localhost:3000/api-docs