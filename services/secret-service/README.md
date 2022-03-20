![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Secrets-Service (working title / codename: _Lynx_)

[API Documentation](http://skm.openintegrationhub.com/api-docs/)

## Basic usage & development


Install packages

```zsh
npm i
```

Start local lynx

```zsh
npm run start
```

Test lynx core framwework components

```zsh
npm test
```

## Run minimal setup

Create env-file under "./.env" and change endpoint/connection settings to fit your environment

```console
PORT=3000
MONGODB_CONNECTION=mongodb://172.17.0.1:27017/secret-service
INTROSPECT_ENDPOINT_BASIC=http://iam.openintegrationhub.com/api/v1/tokens/introspect
IAM_TOKEN=YOUR_IAM_TOKEN
API_BASE=/api/v1
TTL_AUTHFLOW=2m
LOG_LEVEL=error
DEBUG_MODE=false
CRYPTO_DISABLED=true
```

If you are using the IAM OpenId Connect feature, you can also use the following env vars for token introspection

```console
INTROSPECT_TYPE=oidc
INTROSPECT_ENDPOINT_OIDC=http://iam.openintegrationhub.com/op/token/introspection
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
```

Create docker image

```console
docker build . -t oih/secret-service
```

Run container

```console
docker run -p 3000:3000 --env-file=".env.local" oih/secret-service
```

Open your browser and connect to http://localhost:3000/api-docs

## General

This service is used to store and access securely client secrets/credentials (Basic Auth, OAuth tokens, etc.).
Each secret has a list of owners who can access the secret. This service can also create OAuth flows, such as 3-legged and also automatically refresh OAuth accessTokens if a valid refreshToken exists.

### Concept and docs

Current documentation of the concept can be found here: <https://github.com/openintegrationhub/openintegrationhub.github.io/blob/master/docs/5%20-%20Services/SecretService.md>

### Auth clients

An auth client is required for secrets, which require a communication with an external identity provider, e.g. in case of OAuth2 tokens.
After registering your application with the 3rd party (e.g. Google), create an auth client and add your `clientId` and `clientSecret`.
You must also register the callback URL `redirectUri` of Secrets-Service with the third party.
In case of OAuth/OAuth2, you should also define the `auth` and `token` in `endpoints`. See the OpenAPI spec for AuthClient model definition.

Example of a Microsoft Oauth2 auth client

```
{
  "predefinedScope" : "offline_access",
  "endpoints" : {
    "auth" : "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?prompt=select_account&scope={{scope}}&response_mode=query&state={{state}}&redirect_uri={{redirectUri}}&response_type=code&client_id={{clientId}}",
    "token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "userinfo" : "https://login.microsoftonline.com/common/openid/userinfo"
  },
  "clientId" : "${CLIENT_ID}",
  "clientSecret" : "${CLIENT_SECRET}",
  "redirectUri" : "https://${CALLBACK_URL_BASE}/hook",
  "mappings" : {
    "externalId" : {
      "source" : "access_token",
      "key" : "unique_name"
    },
    "scope" : {
      "key" : "scope"
    }
  },
  "__t" : "A_OA2_AUTHORIZATION_CODE",
  "type" : "OA2_AUTHORIZATION_CODE",
  "name" : "Microsoft oAuth2",
  "owners" : [
  ]
}
```

### Secrets

Secrets can be simple basic authentication secrets with `username` and `passphrase` but also OAuth2 tokens.
Users can create and modify secrets. If you have crypto enabled, the sensitive value of a secret (e.g. password or token) will be masked by the service when accessing the secret via API.

### CRYPTO (encryption) for secrets

All `sensitive fields` (listed in src/constant) of every secret will be encrypted before they get stored into database. By default `aes-256-cbc` is used to provide fast and secure encryption. Therefore, you need to specify a `key adapter` to supply users with the keys and setup encryption. Users receive decrypted secrets only if a valid key is provided.

All secrets are encrypted by default. You can disable this by setting the `CRYPTO_DISABLED="true"` env var.
**(!) If you wish to use secrets encryption, make sure you provide the `CRYPTO_KEY` env var with your encryption key. Otherwise a random encryption key will be generated each time you start this service.**

### Starting an OAuth2 (3-legged) flow

- The auth client creates a full qualified URL for the identity provider and returns it via API.
- User/Client can open this URL in browser and is redirected to the 3rd party
- User consents and is redirected back to the callback URL of Secrets-Service
- Secrets-Service uses the auth code from the callback fetches automatically the tokens
- Tokens (refreshToken, accessToken and expires) are stored in a secret

### Specifics

- User authentication and authorization is done currently by introspecting the IAM token. The introspect returns user id, tenant membership and permissions.
- Sensitive data in a secret (password, accessToken, refreshToken) are masked with stars `***` and aren't displayed plain in the response. To see the raw data, the requester must have the `secrets.secret.readRaw` permission (see IAM).
- When fetching an OAuth2 based secret, this service checks if the accessToken has expired or will expire in the next 10min (configurable). If so, the service will automatically refresh the access token, store it in the secret object and return this updated secret.
- If a secret containing an OAuth2 token is being refreshed, the `lockedAt` flag is set with the current timestamp. When secret is updated, the `lockedAt` property is set to `null`. Parallel requests to this secret will undergo a back-off strategy, until a predefined threshold is reached (see `refreshTimeout` in the config, default: 10s). If the secret has not been refreshed in the mean time, a new attempt will be started. The number of retries is limited to 3.
- A secret can have more than one owner. There are two types of delete: **a)** if a secret has more than one owner, then remove only the current owner (user-id) otherwise delete the secret entirely,  **b)** the more privileged delete requires a special permission (see: `secretDeleteAny`).

#### Default Settings

- CRYPTO_DISABLED: **false** - Turns on encryption.
- CRYPTO_ALG_HASH: **sha256** - Hashing of externalId to obfuscate private data.
- CRYPTO_ALG_ENCRYPTION: **aes-256-cbc** - Default algorithm used for encryption.
- CRYPTO_OUTPUT_ENCODING: **latin1** - Charset of encryption output.

## Usage & Customization

### I want to use my own implementation of IAM

When instantiating the server, provide your custom implementation:

```javascript
const server = new Server({
  iam: require("my-iam-lib"),
});
```

Make sure that your IAM implementation exposes methods exported by `secret-service/src/modules/iam.js`.

### I want to use my own implementation of secret encryption

```javascript
const server = new Server({
  adapter: {
    key: require("./your-implementation"),
  },
});
```

### I want to use my own implementation to fetch user's external id

For each adapter you can optionally specify which preprocessor to use. Please see one of the existing preprocessor as an example.

```javascript
const server = new Server({
  adapter: {
    preprocessor: {
      slack: require("./adapter/preprocessor/slack"),
      google: require("./adapter/preprocessor/google"),
      microsoft: require("./adapter/preprocessor/microsoft"),
    },
  },
});
```
