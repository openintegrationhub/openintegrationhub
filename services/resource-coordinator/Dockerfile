FROM node:8.12-alpine AS base
WORKDIR /usr/lib/resource-coordinator

COPY package.json yarn.lock ./
COPY lib/backend-commons-lib lib/backend-commons-lib
COPY lib/resource-coordinator lib/resource-coordinator
COPY services/resource-coordinator/package.json services/resource-coordinator/index.js ./services/resource-coordinator/
COPY services/resource-coordinator/src ./services/resource-coordinator/src
COPY services/resource-coordinator/config/default.json  services/resource-coordinator/config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/lib/resource-coordinator/node_modules ./node_modules
RUN rm yarn.lock
CMD ["yarn", "--cwd", "services/resource-coordinator", "start"]

