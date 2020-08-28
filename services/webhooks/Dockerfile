FROM node:12-alpine AS base
WORKDIR /usr/src/webhooks

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib lib/backend-commons-lib
COPY lib/event-bus lib/event-bus
COPY lib/webhooks lib/webhooks
COPY services/webhooks/package.json  services/webhooks/index.js ./services/webhooks/
COPY services/webhooks/src services/webhooks/src
COPY services/webhooks/config/default.json services/webhooks/config/default.json

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
COPY --from=dependencies /usr/src/webhooks/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/webhooks", "start"]

