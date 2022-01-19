<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="OIH Logo" width="400"/>
</p>

Open source framework for easy data synchronization between business applications.

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Dev Tools

This folder contains two methods of implementing a development environment locally to run the OIH framework.

- The [/minikube folder](minikube/) provides the ability to deploy each service from its public Docker image or using local source code served over NFS. It is activated using the `setup.sh` script in the folder. 
- The [/docker-compose folder](docker-compose/) contains configuration files and helper scripts to run local services directly from Docker. It still relies on minikube to execute flows.
- The [/test-component folder](test-component/) contains a dynamic test component which could be used within the docker-compose approach

Please see the documentation for each tool separately.
