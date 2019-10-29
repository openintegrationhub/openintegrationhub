FROM node:10-alpine AS base
WORKDIR /usr/lib/app

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib ./lib/backend-commons-lib
COPY lib/event-bus ./lib/event-bus
COPY lib/iam-utils ./lib/iam-utils
COPY services/data-hub/package.json services/data-hub/tsconfig.json ./services/data-hub/
COPY services/data-hub/docs ./services/data-hub/docs/

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
COPY services/data-hub ./services/data-hub
RUN cd services/data-hub && yarn install && yarn run build:ts

FROM base AS release
COPY --from=dependencies /usr/lib/app/services/data-hub/dist ./services/data-hub/dist
COPY --from=dependencies /usr/lib/app/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/data-hub", "start"]
