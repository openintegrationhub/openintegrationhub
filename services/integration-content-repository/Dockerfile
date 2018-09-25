FROM node:8.11.1-alpine
LABEL NAME="oih-icr"
LABEL MAINTAINER Hansjörg Schmidt "hschmidt@wice.de"

# set working directory
WORKDIR /usr/src/app

# use changes to package.json to force Docker not to use cache
COPY ./app/iam-utils /usr/src/app/app/iam-utils
COPY package.json /usr/src/app

RUN npm install
RUN cd app/iam-utils && npm install && cp -r ./node_modules/* ../../node_modules/

COPY . /usr/src/app

RUN chown -R 1000:1000 /usr/src/app
USER node

CMD ["node", "server.js"]
