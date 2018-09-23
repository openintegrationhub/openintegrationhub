FROM node:8.12-alpine AS base
WORKDIR /usr/src/flows-operator

COPY src/lib ../../src/lib
COPY services/flows-operator/package.json services/flows-operator/package-lock.json services/flows-operator/index.js ./ 
COPY services/flows-operator/src ./src
COPY services/flows-operator/config/default.json  ./config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN npm ci --production --quiet
RUN cd ../../src/lib && npm ci --production --quiet

FROM base AS release
COPY --from=dependencies /usr/src/flows-operator/node_modules ./node_modules
COPY --from=dependencies /usr/src/lib/node_modules ../../src/lib/node_modules
RUN rm -rf package-lock.json
CMD ["npm", "start"]

