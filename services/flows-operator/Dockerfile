FROM node:8-alpine AS base
WORKDIR /usr/src/flows-operator
COPY lib ../lib
COPY flows-operator/package.json flows-operator/package-lock.json flows-operator/index.js ./ 
COPY flows-operator/src ./src
COPY flows-operator/config/default.json  ./config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN npm install --production --quiet
RUN cd ../lib && npm install --production --quiet

FROM base AS release
COPY --from=dependencies /usr/src/flows-operator/node_modules ./node_modules
COPY --from=dependencies /usr/src/lib/node_modules ../lib/node_modules
RUN rm -rf package-lock.json
CMD ["npm", "start"]

