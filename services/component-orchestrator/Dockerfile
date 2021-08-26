FROM node:12-alpine AS base
LABEL NAME="oih-component-orchestrator"
LABEL MAINTAINER Hans Eggert "hans.eggert@basaas.com"

ARG local

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache bash

COPY yarn.lock ./

COPY services/component-orchestrator/index.js ./
COPY services/component-orchestrator/package.json ./
COPY services/component-orchestrator/src ./src

FROM base AS dependencies

RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python

RUN if [ "$local" == "true" ]; \
    then yarn install --pure-lockfile ; \
    else yarn install --pure-lockfile --production ; \
    fi

FROM base AS release

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "start"]