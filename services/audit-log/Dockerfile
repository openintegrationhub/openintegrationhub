FROM node:8.11.1-alpine
LABEL NAME="audit-log"
LABEL MAINTAINER Sven Höffler "shoeffler@wice.de"


# set working directory
WORKDIR /usr/src/app

# use changes to package.json to force Docker not to use cache
COPY package.json /usr/src/app
COPY lib/event-bus lib/event-bus

RUN npm install --only=prod

COPY . /usr/src/app

RUN chown -R 1000:1000 /usr/src/app
USER node

CMD ["node", "./app/index.js"]
