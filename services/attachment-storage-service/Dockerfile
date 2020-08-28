FROM node:12-alpine AS base
WORKDIR /usr/lib/attachment-storage-service

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY services/attachment-storage-service/package.json services/attachment-storage-service/tsconfig.json ./services/attachment-storage-service/

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
COPY services/attachment-storage-service ./services/attachment-storage-service
RUN yarn install && cd services/attachment-storage-service && yarn run build:ts

FROM base AS release
COPY --from=dependencies /usr/lib/attachment-storage-service/services/attachment-storage-service/dist ./services/attachment-storage-service/dist
COPY --from=dependencies /usr/lib/attachment-storage-service/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/attachment-storage-service", "start"]
