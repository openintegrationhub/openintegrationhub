FROM node:12-alpine AS base
WORKDIR /usr/src/component-repository

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib lib/backend-commons-lib
COPY lib/iam-utils lib/iam-utils
COPY lib/component-repository lib/component-repository
COPY lib/event-bus lib/event-bus
COPY services/component-repository/package.json  services/component-repository/index.js ./services/component-repository/
COPY services/component-repository/src services/component-repository/src
COPY services/component-repository/config/default.json services/component-repository/config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/component-repository/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/component-repository", "start"]

