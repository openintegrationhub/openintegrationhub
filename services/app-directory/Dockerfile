FROM node:8.12.0-alpine
LABEL NAME="app-directory"
ARG local

ADD package.json /tmp/package.json
ADD *.lock /tmp/
ADD .npmrc /tmp/.npmrc
RUN apk --no-cache add \
    python \
    make \
    g++ \
    libc6-compat
RUN if [ "$local" == "true" ]; \
    then cd /tmp && npm install ; \
    else cd /tmp && npm install --production ; \
    fi 
WORKDIR /usr/src/app
ADD . /usr/src/app
RUN ln -s /tmp/node_modules /usr/src/app/
# just for start
USER node

CMD npm run -s start
