# Base image with sources
FROM node:10-alpine AS base
WORKDIR /home/node/maester

COPY src/maester/src ./src
COPY src/maester/package.json ./package.json
COPY src/maester/package-lock.json ./package-lock.json
COPY src/maester/tsconfig.json ./tsconfig.json

# Image for building and installing dependencies
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python && \
    npm ci --unsafe-perm && \
    npm run build && \
    npm ci --only=production --unsafe-perm


# Release image for running quota-service
FROM base AS release
COPY --from=dependencies /home/node/maester/node_modules ./node_modules
COPY --from=dependencies /home/node/maester/dist ./dist

RUN chown -R node:node /home/node
USER node

CMD ["npm", "start"]
