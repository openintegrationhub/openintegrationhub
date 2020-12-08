FROM node:12-alpine AS base

FROM base AS dependencies
RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python \
    bash

WORKDIR /usr/src/raw-data-storage

COPY package.json yarn.lock ./
COPY lib/event-bus lib/event-bus
COPY lib/iam-utils lib/iam-utils
COPY services/raw-data-storage/package.json ./services/raw-data-storage/
COPY services/raw-data-storage/src services/raw-data-storage/src

RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/raw-data-storage/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/raw-data-storage", "start"]