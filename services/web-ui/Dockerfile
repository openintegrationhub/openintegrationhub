FROM node:12-alpine
LABEL NAME="oih-web-ui"
ARG local

ADD package.json /tmp/package.json
RUN apk --no-cache add \
    python \
    make \
    g++ \
    libc6-compat
RUN if [ "$local" == "true" ]; \
    then cd /tmp && yarn install ; \
    else cd /tmp && yarn install --production ; \
    fi 
WORKDIR /usr/src/app
ADD . /usr/src/app
RUN ln -s /tmp/node_modules /usr/src/app/ && chown -R 1000:1000 /usr/src/app
# just for start
USER node

CMD npm run -s serve
