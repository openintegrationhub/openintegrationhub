FROM node:12-alpine AS base
LABEL NAME="oih-dispatcher-service"
LABEL MAINTAINER Sven Höffler "shoeffler@wice.de"

WORKDIR /usr/src/dispatcher-service

RUN apk add --no-cache bash

COPY package.json yarn.lock ./
COPY services/dispatcher-service/package.json ./services/dispatcher-service/
COPY services/dispatcher-service/app services/dispatcher-service/app

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/dispatcher-service/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/dispatcher-service", "start"]
