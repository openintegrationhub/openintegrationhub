version: 2
aliases:
  - &docker_environment
    - image: circleci/node:8-stretch
    - image: circleci/mongo:3.6
    - image: circleci/rabbitmq:3.6.6
  - &checkout
    path: ~/elasticio
  - &restore_cache_dependencies
    name: "Restoring node_modules from the cache"
    keys:
      - node-modules-cache-{{ checksum "package.json" }}
  - &run_npm_install
    name: Installing Dependencies
    command: npm config set '//registry.npmjs.org/:_authToken' '${NPM_TOKEN}' && npm install --no-package-lock --no-audit --verbose
  - &save_cache_dependencies
    name: "Saving node_modules into the cache"
    key: node-modules-cache-{{ checksum "package.json" }}
    paths:
      - node_modules
  - &run_build
    name: Building an Image
    command: ~/elasticio/.circleci/run.sh
  - &common_steps
    - checkout: *checkout
    - restore_cache: *restore_cache_dependencies
    - run: *run_npm_install
    - save_cache: *save_cache_dependencies
    - setup_remote_docker
    - run: *run_build
  - &common_environment
    docker: *docker_environment
    steps: *common_steps
  - &workflow_development
    filters:
      tags:
        ignore: /^v((([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/
  - &workflow_release
    filters:
      branches:
        ignore: /.*/
      tags:
        only: /^v((([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/
jobs:
  admiral:
    <<: *common_environment
    working_directory: ~/elasticio/src/admiral
  api:
    <<: *common_environment
    working_directory: ~/elasticio/src/api
  commons:
    <<: *common_environment
    working_directory: ~/elasticio/src/commons
  frontend:
    working_directory: ~/elasticio/src/frontend
    docker:
      - image: circleci/ruby:2.4.4-node-browsers
      - image: circleci/mongo:3.6
      - image: circleci/rabbitmq:3.6.6
    steps:
      - checkout: *checkout
      - run: gem install sass
      - restore_cache: *restore_cache_dependencies
      - run: *run_npm_install
      - save_cache: *save_cache_dependencies
      - setup_remote_docker
      - run: *run_build
  gendry:
    <<: *common_environment
    working_directory: ~/elasticio/src/gendry
  gitreceiver:
    <<: *common_environment
    working_directory: ~/elasticio/src/gitreceiver
  gold-dragon-coin:
    <<: *common_environment
    working_directory: ~/elasticio/src/gold-dragon-coin
  handmaiden:
    <<: *common_environment
    working_directory: ~/elasticio/src/handmaiden
  lookout:
    <<: *common_environment
    working_directory: ~/elasticio/src/lookout
  petstore-api:
    <<: *common_environment
    working_directory: ~/elasticio/src/petstore-api
  platform-storage-slugs:
    <<: *common_environment
    working_directory: ~/elasticio/src/platform-storage-slugs
  raven:
    <<: *common_environment
    working_directory: ~/elasticio/src/raven
  scheduler:
    <<: *common_environment
    working_directory: ~/elasticio/src/scheduler
  steward:
    <<: *common_environment
    working_directory: ~/elasticio/src/steward
  webhooks:
    <<: *common_environment
    working_directory: ~/elasticio/src/webhooks
  wiper:
    <<: *common_environment
    working_directory: ~/elasticio/src/wiper
workflows:
  version: 2
  build_development:
    jobs:
      - admiral:
          <<: *workflow_development
      - api:
          <<: *workflow_development
      - commons:
          <<: *workflow_development
      - frontend:
          <<: *workflow_development
      - gendry:
          <<: *workflow_development
      - gitreceiver:
          <<: *workflow_development
      - gold-dragon-coin:
          <<: *workflow_development
      - handmaiden:
          <<: *workflow_development
      - lookout:
          <<: *workflow_development
      - petstore-api:
          <<: *workflow_development
      - platform-storage-slugs:
          <<: *workflow_development
      - raven:
          <<: *workflow_development
      - scheduler:
          <<: *workflow_development
      - steward:
          <<: *workflow_development
      - webhooks:
          <<: *workflow_development
      - wiper:
          <<: *workflow_development
  build_release:
    jobs:
      - admiral: #res. coord
          <<: *workflow_release
      - api:
          <<: *workflow_release
      - commons:
          <<: *workflow_release
      - frontend:
          <<: *workflow_release
      - gendry:
          <<: *workflow_release
      - gitreceiver:
          <<: *workflow_release
      - gold-dragon-coin:
          <<: *workflow_release
      - handmaiden:
          <<: *workflow_release
      - lookout:
          <<: *workflow_release
      - petstore-api:
          <<: *workflow_release
      - platform-storage-slugs:
          <<: *workflow_release
      - raven:
          <<: *workflow_release
      - scheduler:
          <<: *workflow_release
      - steward:
          <<: *workflow_release
      - webhooks: #comm. router
          <<: *workflow_release
      - wiper:
          <<: *workflow_release
