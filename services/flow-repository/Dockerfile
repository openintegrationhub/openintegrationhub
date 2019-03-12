FROM node:8.11.1-alpine
LABEL NAME="oih-flow-repository"
LABEL MAINTAINER Hansjörg Schmidt "hschmidt@wice.de"

RUN apk --no-cache add \
    python \
    make \
    g++ \
    libc6-compat

# set working directory
WORKDIR /usr/src/app

# use changes to package.json to force Docker not to use cache
COPY package.json /usr/src/app

RUN npm install --only=prod

COPY . /usr/src/app

RUN chown -R 1000:1000 /usr/src/app
USER node

CMD ["node", "./app/index.js"]
