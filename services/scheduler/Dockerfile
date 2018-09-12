FROM node:8-alpine AS base
WORKDIR /usr/src/scheduler
COPY lib ../lib
COPY scheduler/package.json scheduler/package-lock.json scheduler/index.js ./

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN npm install --production --quiet

FROM base AS release
COPY --from=dependencies /usr/src/scheduler/node_modules ./node_modules
RUN rm -rf package-lock.json
CMD ["npm", "start"]

