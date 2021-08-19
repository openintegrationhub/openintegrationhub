FROM node:12-alpine AS base
LABEL NAME="oih-governance-service"
LABEL MAINTAINER Hansjörg Schmidt "hschmidt@wice.de"

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache bash

COPY yarn.lock ./
COPY services/governance-service/package.json ./
COPY services/governance-service/app ./app

FROM base AS dependencies

RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python \
    bash

RUN if [ "$local" == "true" ]; \
    then yarn install ; \
    else yarn install --production ; \
    fi

FROM base AS release

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "start"]