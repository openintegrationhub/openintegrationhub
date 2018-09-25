FROM node:8.12-alpine AS base
WORKDIR /usr/src/flows-operator

COPY package.json yarn.lock ./
COPY src/backendCommonsLib src/backendCommonsLib
COPY services/flows-operator/package.json services/flows-operator/index.js ./services/flows-operator/
COPY services/flows-operator/src ./services/flows-operator/src
COPY services/flows-operator/config/default.json  services/flows-operator/config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/flows-operator/node_modules ./node_modules
RUN rm yarn.lock
CMD ["yarn", "--cwd", "services/flows-operator", "start"]

