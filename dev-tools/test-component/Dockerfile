FROM node:16-alpine
LABEL NAME="test-component"
LABEL MAINTAINER Hans Eggert "hans.eggert@basaas.com"
LABEL SUMMARY="This image is used for development docker-compose"

WORKDIR /mnt-test/dev-tools/test-component

RUN chown -R node:node .

USER node

ENTRYPOINT ["/mnt-test/dev-tools/test-component/start.sh"]
