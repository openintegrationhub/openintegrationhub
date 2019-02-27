FROM node:8.12-alpine AS base
WORKDIR /usr/src/communication-router

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib lib/backend-commons-lib
COPY lib/event-bus lib/event-bus
COPY lib/webhooks lib/webhooks
COPY services/communication-router/package.json  services/communication-router/index.js ./services/communication-router/
COPY services/communication-router/src services/communication-router/src
COPY services/communication-router/config/default.json services/communication-router/config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/communication-router/node_modules ./node_modules
RUN rm yarn.lock
CMD ["yarn", "--cwd", "services/communication-router", "start"]

