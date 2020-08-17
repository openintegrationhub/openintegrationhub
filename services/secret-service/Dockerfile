FROM node:12-alpine AS base
LABEL NAME="secret-service"
ARG local
WORKDIR /usr/lib/secret-service

RUN apk update && apk add --no-cache bash

COPY package.json yarn.lock ./
COPY lib/secret-service lib/secret-service
COPY lib/iam-utils lib/iam-utils
COPY services/secret-service/package.json services/secret-service/index.js ./services/secret-service/
COPY services/secret-service/src ./services/secret-service/src

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk update && apk add --no-cache \
    make \
    gcc \
    g++ \
    python \
    libc6-compat

RUN if [ "$local" == "true" ]; \
    then yarn ; \
    else yarn --production ; \
    fi 

RUN chown -R node:node .
USER node

CMD ["yarn", "--cwd", "services/secret-service", "start"]