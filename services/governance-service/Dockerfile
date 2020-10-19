FROM node:12-alpine AS base
LABEL NAME="oih-governance-service"
LABEL MAINTAINER Hansjörg Schmidt "hschmidt@wice.de"

WORKDIR /usr/src/governance-service

RUN apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/event-bus lib/event-bus
COPY services/governance-service/package.json ./services/governance-service/
COPY services/governance-service/app services/governance-service/app

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/governance-service/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/governance-service", "start"]
