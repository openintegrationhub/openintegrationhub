FROM node:8-alpine AS base
WORKDIR /usr/src/communication-router
COPY lib ../lib
COPY communication-router/package.json communication-router/package-lock.json communication-router/index.js ./
COPY communication-router/src ./src
COPY communication-router/config/default.json ./config/default.json

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN npm install --production --quiet
RUN cd ../lib && npm install --production --quiet

FROM base AS release
COPY --from=dependencies /usr/src/communication-router/node_modules ./node_modules
COPY --from=dependencies /usr/src/lib/node_modules ../lib/node_modules
RUN rm -rf package-lock.json
CMD ["npm", "start"]

