![prod](https://img.shields.io/badge/Status-Production-brightgreen.svg)

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# RDS Service

RDS (raw data storage) is responsible for keeping data untransformed in its original form.

During a flow runtime, data can be transmitted via the Ferryman before it is used within the transformer.

This data can subsequently be consumed at any time within the scope of various processes if the respective raw data id is present.

RDS service implements a basic version that persists raw data received through Message Queue in a MongoDB.

