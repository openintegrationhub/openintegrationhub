FROM node:10-alpine AS base
WORKDIR /usr/lib/attachment-storage-service

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib ./lib/backend-commons-lib
COPY lib/iam-utils ./lib/iam-utils
COPY lib/attachment-storage-service/package.json lib/attachment-storage-service/tsconfig.json ./lib/attachment-storage-service/
COPY lib/attachment-storage-service/docs ./lib/attachment-storage-service/docs/
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
COPY lib/attachment-storage-service ./lib/attachment-storage-service
COPY services/attachment-storage-service ./services/attachment-storage-service
RUN cd lib/attachment-storage-service && yarn install && yarn run build \
    && cd ../../services/attachment-storage-service && yarn install && yarn run build:ts

FROM base AS release
COPY --from=dependencies /usr/lib/attachment-storage-service/lib/attachment-storage-service/dist ./lib/attachment-storage-service/dist
COPY --from=dependencies /usr/lib/attachment-storage-service/services/attachment-storage-service/dist ./services/attachment-storage-service/dist
COPY --from=dependencies /usr/lib/attachment-storage-service/node_modules ./node_modules
RUN rm yarn.lock

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/attachment-storage-service", "start"]
