FROM node:12-alpine AS base

WORKDIR /usr/src/rds

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY services/rds/package.json ./services/rds/
COPY services/rds/src services/rds/src

FROM base AS dependencies

RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python \
    bash

RUN yarn install --production

FROM base AS release

COPY --from=dependencies /usr/src/rds/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/rds", "start"]