FROM node:16-alpine AS base
LABEL NAME="oih-web-ui"

ENV serviceName=web-ui
ARG local

WORKDIR /usr/src/

COPY package-lock.json ./
COPY package.json ./

COPY services/$serviceName services/$serviceName

RUN apk update && apk add --no-cache bash

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime

FROM base AS dependencies

RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python3

RUN npm ci
RUN npm prune --production

FROM base AS release

# copy folders to keep node_modules
COPY --from=dependencies /usr/src/node_modules /usr/src/node_modules
COPY --from=dependencies /usr/src/services /usr/src/services

RUN rm package-lock.json

RUN chown -R node:node .
USER node

CMD npm run -s serve --workspace=$serviceName