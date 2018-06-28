FROM node:8-alpine AS base
WORKDIR /usr/src/flows-operator
COPY package.json package-lock.json index.js QueueCreator.js ./

# Image for building and installing dependencies
# node-gyp is required as dependency by some npm package
# but node-gyp requires in build time python, build-essential, ....
# that's not required in runtime
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python
RUN npm install --production --quiet

FROM base AS release
COPY --from=dependencies /usr/src/flows-operator/node_modules ./node_modules
RUN rm -rf package-lock.json
CMD ["npm", "start"]

