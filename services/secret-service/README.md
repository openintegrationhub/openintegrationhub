# SKM Service (working title / codename: *Lynx*)

[Documentation on Swagger Hub](https://app.swaggerhub.com/apis/basaas/secret-service/2.1.0/)

### Basic usage

Install packages
```zsh 
yarn
```

Start local lynx
```zsh 
yarn start
```

Watch server and restart after code changes
```zsh 
yarn watch
```

Test lynx components
```zsh 
yarn test
```

# Run in local Docker container

Create env-file under "./.env.local"
```console
PORT=3000
MONGODB_CONNECTION=mongodb://host.docker.internal:27017/lynx
API_BASE=/api/v1
TTL_AUTHFLOW=2m
INTROSPECT_TYPE=OIDC
INTROSPECT_ENDPOINT=https://host.docker.internal:3002/op/token/introspection
IAM_OIDC_SERVICE_CLIENT_ID=lynx
IAM_OIDC_SERVICE_CLIENT_SECRET=lynx
LOGGING_LEVEL=error
TTL_AUTHFLOW=2m
DEBUG_MODE=false
IAM_OIDC_SERVICE_CLIENT_ID=lynx
IAM_OIDC_SERVICE_CLIENT_SECRET=lynx
ALLOW_SELF_SIGNED=true
```

Create docker image
```console
docker build .
```

Run container
```console
docker run --env-file=".env.local" -it {containerId}
```