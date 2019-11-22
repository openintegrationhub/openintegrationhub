![alpha](https://img.shields.io/badge/Status-Alpha-yellowgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Reports & Analytics (working title / codename: *TBD*)

<!-- [Documentation on Swagger Hub](https://app.swaggerhub.com/) -->

## Configuration

See the default config in src/config/index.js

The following list contains the environment variables you can set to configure the service:

* **PORT** - Service port, *default*: 3000
* **LOG_NAMESPACE** - Namespace for all emitted logs, *default*: 'meta-data-repository'
* **LOG_LEVEL** - Set global log level, *default*: 'error'
* **RABBITMQ_URI** - RabbitMQ for the OIH event bus; *default*: 'amqp://guest:guest@localhost:5672'
* **MONGODB_CONNECTION** – MongoDB connection string to replica set, *default*: 'mongodb://localhost:27017/meta-data-repository?replicaSet=rs`'
* **DEBUG_MODE** – Get additional debug log, *default*: 'false'
---

## Event controller

This service is listening to all events.

---

## Development

Install packages

```zsh
yarn
```

Start local TBD

```zsh
yarn start
```

Watch server and restart after code changes

```zsh
yarn watch
```

Test TBD components

```zsh
yarn test
```
