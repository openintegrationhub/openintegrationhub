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
PORT=3000
MONGODB_CONNECTION=mongodb://host.docker.internal:27017/meta-data-repository
INTROSPECT_ENDPOINT_BASIC=http://iam.openintegrationhub.com/api/v1/tokens/introspect
IAM_TOKEN=YOUR_IAM_TOKEN
API_BASE=/api/v1
LOGGING_LEVEL=error
DEBUG_MODE=false
```

If you are using the IAM OpenId Connect feature, you can also use the following env vars for token introspection

```console
INTROSPECT_TYPE=oidc
INTROSPECT_ENDPOINT_OIDC=https://host.docker.internal:3002/op/token/introspection
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
```

Create docker image

```console
docker build .
```

Run container

```console
docker run --env-file=".env.local" -it {containerId}
```

## General

### Concept and docs

#### Default Settings
