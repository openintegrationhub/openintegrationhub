<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="OIH Logo" width="400"/>
</p>

Open source framework for easy data synchronization between business applications.

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Dev Tools

This folder contains two methods of implementing a development environment locally to run the OIH framework.

- The [/minikube folder](minikube/) is based off of the basic minikube installation found in the [root minikube folder](../minikube). It adds the ability to optionally launch each service using local source code served over NFS instead of the public Docker image.
- The [/docker-compose folder](docker-compose/) contains configuration files and helper scripts to run local services directly from Docker. It still relies on minikube to execute flows.

Please see the documentation for each tool separately.
