FROM node:8.12-alpine AS base
WORKDIR /usr/src/scheduler

COPY package.json yarn.lock ./
COPY src/scheduler src/scheduler
COPY services/scheduler/package.json services/scheduler/app.js ./services/scheduler/
COPY services/scheduler/config services/scheduler/config
COPY services/scheduler/src services/scheduler/src

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN yarn install --production

FROM base AS release
COPY --from=dependencies /usr/src/scheduler/node_modules ./node_modules
RUN rm yarn.lock
CMD ["yarn", "--cwd", "services/scheduler", "start"]

