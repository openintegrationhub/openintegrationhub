![alpha](https://img.shields.io/badge/Status-Alpha-yellowgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Meta-Data-Repository (working title / codename: *TBD*)

[Documentation on Swagger Hub](https://app.swaggerhub.com/apis/basaas5/metadata-service/0.0.2)

## Basic usage & development

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

## Run in local Docker container

Create env-file under "./.env.local"

```console
MONGODB_CONNECTION=mongodb://172.17.0.1:27017/meta-data-repository
LOG_LEVEL=error
IAM_TOKEN=token
DEBUG_MODE=false
REFRESH_TIMEOUT=600
EXPIRATION_OFFSET=-100
PAGINATION_PAGE_SIZE=10
INTROSPECT_ENDPOINT_BASIC=http://iam.openintegrationhub.com/api/v1/tokens/introspect
```

Create docker image

```console
docker build . -t oih/meta-data-repository
```

Run container

```console
docker run -p 3000:3000 --env-file=".env.local" oih/meta-data-repository
```

Open your browser and connect to http://localhost:3000/api-docs
```

#### Default Settings

* IMPORT_FILE_PATH: __temp__ - Defines file upload directory.
* URLS_WITH_PORT: __true__ - If true PORT will be added to schema URL. i.e http://localhost:3000/foo/bar
