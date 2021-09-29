FROM node:16-alpine AS base
LABEL NAME="oih-snapshots-service"

ENV serviceName=snapshots-service

WORKDIR /usr/src/

COPY package-lock.json ./
COPY package.json ./

# copy used libs
COPY lib/iam-utils lib/iam-utils
COPY lib/backend-commons-lib lib/backend-commons-lib

COPY services/$serviceName services/$serviceName

RUN apk update && apk add --no-cache bash

FROM base AS dependencies

RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python3

RUN npm ci
RUN npm run build:ts --workspace=$serviceName
RUN npm prune --production

FROM base AS release

# copy build artifacts
COPY --from=dependencies /usr/src/services/$serviceName/dist /usr/src/services/$serviceName/dist
# copy folders to keep node_modules
COPY --from=dependencies /usr/src/node_modules /usr/src/node_modules
COPY --from=dependencies /usr/src/services /usr/src/services
COPY --from=dependencies /usr/src/lib /usr/src/lib

RUN rm package-lock.json

RUN chown -R node:node .
USER node

CMD npm start --workspace=$serviceName