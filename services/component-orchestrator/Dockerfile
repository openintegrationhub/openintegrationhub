FROM node:12-alpine AS base
WORKDIR /usr/lib/component-orchestrator

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib lib/backend-commons-lib
COPY lib/component-orchestrator lib/component-orchestrator
COPY lib/event-bus lib/event-bus
COPY lib/iam-utils lib/iam-utils
COPY services/component-orchestrator/package.json services/component-orchestrator/index.js ./services/component-orchestrator/
COPY services/component-orchestrator/src ./services/component-orchestrator/src
COPY services/component-orchestrator/config/default.json  services/component-orchestrator/config/default.json

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
COPY --from=dependencies /usr/lib/component-orchestrator/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/component-orchestrator", "start"]

