FROM node:12-alpine AS base
LABEL NAME="oih-template-repository"
LABEL MAINTAINER James Weber "james.weber@cloudecosystem.org"

WORKDIR /usr/src/template-repository

RUN apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/event-bus lib/event-bus
COPY services/template-repository/package.json ./services/template-repository/
COPY services/template-repository/app services/template-repository/app

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/template-repository/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/template-repository", "start"]
