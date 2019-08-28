![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# IAM Service (working title / codename: *Heimdal*)

Heimdal provides basic (JWT only) and advanced (OpenId-Connect compatible) Authentication, Authorization and User management as a service.

## General

Heimdal supports two modes of authentication:

* Simple (which is called internaly **basic** mode)
* OIDC (OpenId-Connect)

The default mode is **oidc** which can be overriden with the **process.env.AUTH_TYPE** (see section **Configuration**)

==A default admin account is also created. **You should modify the password after the setup, as this is a major security issue!**==

We currently use MongoDB as storage. The storage is abstracted through data access objects in src/dao directory. Our aim is to provide an interface to allow interchangeability of other storages via DAOs.

### Simple/Basic mode

In this mode Heimdal generates a simple JWT token and uses currently *HMAC* to sign the token. We will add *RSA* signing for simple mode in the upcoming release, which will support rotating keys.

If you use HMAC and want to validate the JWT in other services, you have to provide the shared secret to the validating component. Heimdal also has a corresponding npm-module, which contains the validate methods and an express middleware. Please see the docs for detailed configuration and API description.

#### Login

POST **${BASE_URL}/login**

Login with username, password (JSON payload). A JSON containing the token will be returned.
Provide the token in future requests as a bearer token.

```shell
Authorization: Bearer ${TOKEN}
```

The token contains at least following claims:

* username
* role
* memberships (user <-> tenant memberships)

#### Refresh the token

GET **${BASE_URL}/token/refresh**

You must provide you current token as bearer token. The repsonse will contain the new token. The TTL of the token can be configured via Env variable.

#### Further examples

Usage examples can be found in the *examples* directory as well as in unit/integration tests.

---

### OIDC mode

As OpenId-Connect provider we use this great implementation https://github.com/panva/node-oidc-provider

In order to get started, following steps should be considered:

* a RSA keystore will be auto-generated and stored in ProjectRootDir/keystore/keystore.json
  * You can also mount your own keystore by providing the the full path to file via **KEYSTORE_PATH** variable
* default client will be added, which can befound in src/oidc/util/clients/service-clients.js
	* you can provide the client password as an env variable **SERVICE_CLIENT_SECRET**
	* otherwise a default password will be auto generated on startup and logged to stdout
* a default *service account* will be created
	* you can provide the default service account password as an env variable **SERVICE_ACCOUNT_PASSWORD**
  * otherwise a default password will be auto generated on startup and logged to stdout

#### Examples

Usage examples (e.g. create client, verify token, update account, revoke token, etc.) can be found in the *src/tasks/oidc* directory as well as in unit/integration tests.

---

## Configuration

See the default config in src/config/index.js

The following list contains the environment variables you can set to configure the service:

* **IAM_BASEURL** - OIDC Prodiver base url. *default*: https://127.0.0.1:3099
* **IAM_APIBASE** - API Base, *default*: 'api/v1'
* **IAM_ORIGINWHITELIST** - you can provider a comma-separated list of origings, which should be allowed to access the provider. In development, this list is extended with '127.0.0.1,localhost'
* **IAM_AUTH_TYPE** - 'oidc' or 'basic'. *default*: oidc
* **IAM_DEBUG** - Boolean. *default*: false
* **IAM_PORT** - *default*: 3099
* **IAM_MONGODB_CONNECTION** - *default*: 'mongodb://localhost/accounts'
* **IAM_ACC_ADMIN_USERNAME**
* **IAM_ACC_ADMIN_PASSWORD**
* **IAM_ACC_SERVICEACCOUNT_USERNAME**
* **IAM_ACC_SERVICEACCOUNT_PASSWORD**
* **IAM_JWT_AUDIENCE** - *default*: 'example.com'. See JWT spec for more information.
* **IAM_JWT_ALGORITHM** - *default*: HS512. Possible values: HS256, RS256, RS512, etc. See JWT spec.
* **IAM_JWT_EXPIRES** - *default*: '3h'. Expressed in seconds or a string describing a time span zeit/ms. Eg: 60, "2 days", "10h", "7d". A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default ("120" is equal to "120ms").
* **IAM_JWT_SECRET** - Shared secret to sign JWT when used with HMAC
* **IAM_JWT_COOKIENAME**
* **IAM_OIDC_DBPREFIX** - *default*: oidc
* **IAM_OIDC_MAXAGE** - value in seconds. *default*: 1d in ms
* **IAM_OIDC_TTL_ACCESSTOKEN** - value in s. *default*: 1h
* **IAM_OIDC_TTL_AUTHCODE** - value in s. *default*: 10min
* **IAM_OIDC_TTL_CLIENTCRED** - value in s. *default*: 10min
* **IAM_OIDC_TTL_IDTOKEN** - value in s. *default*: 1h
* **IAM_OIDC_TTL_REFRESHTOKEN** - value in s. *default*: 1d
* **IAM_OIDC_TTL_REGACCESSTOKEN** - value in s. *default*: 1d
* **KEYSTORE_PATH** - Full path to a keystore. If no path is provided, keystore will be auto generated and saved in project root. ==You should always mount a directory and provide a full path to a json file, where the keys should be read and stored.==

---

## Minimal Setup / Local development

* Create a MongoDB Database
* Run `npm install` to install all dependencies
* Rename the provided *nodemon_example.json* to *nodemon.json*
* Run `npm run watch` to start the service locally 

---

## REST-API documentation

Visit the route **${BASE_URL}/api-docs** to view the Swager API documentation.

---

## Data Model

Each account can have 0..n memberships. A membership assigns an account to a tenant with a tenant specific role, e.g. Alice can be member of tenant T1 with a role TENANT_GUEST, but at the same time member of Tenant T2 as TENANT_ADMIN.

* Tenant
* Account
  * Can have multiple memberships as tuple of &lt;_tenant_, _role_&gt;

Currently available roles are:

* TENANT_ADMIN
* TENANT_INTEGRATOR
* TENANT_DEVELOPER
* TENANT_GUEST

It is planed to make roles more generic and extensible, which would allow this service to be used broadly.

---

## Usage

### Login

POST: /login (see open api docs)

### Tokens

#### Create a token

POST /api/v1/tokens (see open api docs)

_If you want to create a permanent token, pass the "tokenLifeSpan" of -1_

#### Introspect a token

POST /api/v1/tokens/introspect (see open api docs)

---

## Operations

* This service can run in a replica set and has no session stickiness
* All sessions are stored in the database, which should allow a HA setup

* we provide a basic Configuration for Kubernetes under /k8s

The Kubernetes YAML's (deployment and Service) relay on Secrets which need to created first and we RECOMMEND to use HASHES for the Secret Strings and   
policy proved Passwords for the Admin and Service Account.

1. mongosecret-oih-iam  
  1.1  
  key/value  
  url = 'mongodb://USERNAME:PASSWORD@MONGOSERVER1:27017,MONGOSERVER2:27017,MONGOSERVER3:27017/accounts?ssl=true&replicaSet=NAME&authSource=admin'

2. oidc-oih-iam-dev  
  2.1  
  key/value
  jwtsecret = 'somestring'  
  cookiesecrets = 'somestring'  
  ADMIN_PASSWORD = 'somestring'  
  serviceaccpass = 'somestring'  
  client-secret = 'somestring'  

3. oidc-certs
  3.1  
  Filename: keystore.json  
  step1: navigate in the Repo folder to ```services/iam```
  step2: execute ```yarn``` 
  step3: execute ```node -e "require('./src/util/keystore').generateFile()"``` 
  step4: upload ```./keystore/keystore.json``` as K8S secret to the correct namspace with 
  ```kubectl -n NAMESPACE create secret generic oidc-certs  --from-file=keystore.json='./keystore/keystore.json'```

## Useful commands

### Generate keystore

```zsh
npm run generate-keystore
```

### Run tasks as examples

Start local iam

```zsh
npm run watch
```

Run a task

```zsh 
npm run task <path-to-example>
```

```zsh
npm run task ./src/tasks/oidc/update-user
```

* **PORT** - defaults to 3099
* **IAM_BASEURL** - i.e. "https://127.0.0.1:3099"
* **IAM_SERVICE_CLIENT_ID** - xxx
* **IAM_SERVICE_CLIENT_SECRET** - xxx
* **AUTH_TYPE** - "basic" or "oidc"
* **IAM_ACC_ADMIN_USERNAME** - xxx
* **IAM_ACC_ADMIN_PASSWORD** - xxx
* **DEBUG** -  true/false

## Build Docker and push to registry ###

docker build -t eu.gcr.io/${GCP_PROJECT_ID}/iam
gcloud docker -- push eu.gcr.io/${GCP_PROJECT_ID}/iam

## Test run

docker run --rm -ti -v $PWD/uploads:/home/uploads --name -p 80:3099 iam eu.gcr.io/${GCP_PROJECT_ID}/iam
