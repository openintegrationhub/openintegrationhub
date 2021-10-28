<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

Open source framework for easy data synchronization between business applications.

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.org/)

# Minikube Development Guide

The minikube-based development setup enables users to bring up a local implementation of the OIH Framework based on the current service images found on Docker Hub, while individually selecting which services they would like to deploy from their own local source folders.
![linux](https://img.shields.io/badge/Linux-red.svg) ![Windows](https://img.shields.io/badge/Windows-blue.svg) ![Mac](https://img.shields.io/badge/Mac-green.svg)

- [Requirements](#requirements)
- [Configuration](#configuration)
- [Usage](#usage)
- [Running the Framework](#running-the-framework)

# Requirements

**Please make sure to clone the [monorepo](https://github.com/openintegrationhub/openintegrationhub) before you start.**

The development environment requires:

- minikube
- kubectl
- python3
- curl
- base64

Make sure that minikube is endowed with sufficient resources. We suggest at least:

- _8GB of memory_
- _4 CPUs_

The setup script will attempt to provision the minikube instance with these values by default on execution. This can be changed by altering the variables _MK_MEMORY_ and _MK_CPUS_.

| ![Windows](https://img.shields.io/badge/Windows-blue.svg) <br> If you're using Windows we suggest to use virtual box. In order to use it, Hyper-V must be disabled [Enable/Disable Hyper-V on Windows 10](https://docs.microsoft.com/de-de/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v).You may also have to enable virtualisation features in you BIOS. |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

| ![Windows](https://img.shields.io/badge/Windows-blue.svg) ![Mac-Intel](https://img.shields.io/badge/Mac--Intel-green.svg) <br> If you're using Docker for Desktop it overwrites the actual kubectl version. THis version is generally not compatible with minikube. There are two options to correct this:                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <ul><li>Download the `kubectl.exe` from the [kubectl installation page](https://kubernetes.io/docs/tasks/tools/#kubectl). Navigate to the docker directory (e.g. Program Files\Docker\Docker\resources\bin) and replace the kubectl.exe in this folder with the one you just downloaded.</li><li>Use the "Edge" version of Docker Desktop. This can be done by installing the edge version of the application from the [Docker Desktop site](https://docs.docker.com/desktop/). If you already have Docker Desktop installed, you can switch to the Edge version from the Docker menu. Select **Preferences > Command Line** and then activate the **Enable experimental features** toggle. After selecting **Apply & Restart**, Docker will update versions. More information can be found [here](https://docs.docker.com/docker-for-mac/install/#switch-between-stable-and-edge-versions).</li></ul> |

| ![Windows](https://img.shields.io/badge/Windows-blue.svg) ![Mac-Intel](https://img.shields.io/badge/Mac--Intel-green.svg) <br> The OIH Framework requires the _ingress_ addon for kubernetes. This is not supported via Docker Bridge for Mac and Windows. Therefore, on these Operating Systems, minikube must be started with the flag `--vm=true`. This is handled in the setup script. More information can be found on the [minikube Github page](https://github.com/kubernetes/minikube/issues/7332). |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| ![Mac-ARM](https://img.shields.io/badge/Mac--ARM-yellowgreen.svg) <br> Some networking features available on Intel based systems are not available on newer Macs running Apple Silicon chips. Therefore, the system must be accessed using the `minikube tunnel` from a localhost address. The "example.com" service addresses are then mapped to localhost.|
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

# Configuration

Before running the setup script, the location of your host files must be updated in ./1.1-CodeVolume/sourceCodeVolume.yaml and the HOST_OIH_DIRECTORY in setup.sh. The server host is the IP address which minikube uses to access the host. In order to verify your server address, you will need to start minikube and then execute the following command: `minikube ssh grep host.minikube.internal /etc/hosts | cut -f1`. The server value as provided ('host.docker.internal') will work in most cases.

The path is the path to the root of your cloned repository / base path of the framework

```
nfs:
    server: 192.168.64.1
    path: '/Users/user/projects/openintegrationhub'
```

# Usage

From the $OIH_ROOT/dev-tools/minikube folder, call the setup script

```
bash ./setup.sh
```

The script will check for prerequisites, and attempt to build all services.

Additionally, the following options may be sent in the arguments to `setup.sh`.

- `-c`: Clear Minikube. The minikube cluster will be deleted and rebuilt from scratch.

- `-s`: Skip Deployment. Any service names which are provided as arguments to this flag will not be included in the running cluster. They will be temporarily deployed to ensure all dependencies are met, then deleted at the end of startup.

  > Example: `bash ./setup.sh -s meta-data-repository, snapshots-service`

- `-d`: Development Mode. Any service names which are provided as arguments to this flag will be deployed from the local source files. Instead of being deployed from the Docker Hub containers, a generic node container will be deployed, and the source directory will be mounted through NFS. Changes to the source files will be watched and reflected in the running containers.

  > Example: `bash ./setup.sh -d iam, component-orchestrator`

- `-i`: Use Custom Component Image. This setup automatically deploys a development connector and includes it in sample flows. To change the container which is used for this connector, include an image name here. (Default image: `openintegrationhub/dev-connector:latest`)

- `-p`: Start Proxy. If this flag is set, then `kubectl` will set up proxy connections to Mongo, RabbitMQ, and Redis for use in debugging backend and messaging systems.

# Running the framework

Once the setup script has run, the deployment will run the Framework inside of minikube whenever it is running, until the deployment is deleted. You can use the commands `minikube start` and `minikube stop` to control your resources.

| ![Mac-ARM](https://img.shields.io/badge/Mac--ARM-yellowgreen.svg) <br> Due to the aforementioned limitations of networking with the Docker for Mac environment, it is not possible to access the framework endpoints on the minikube cluster without settings up port forwarding through kubectl or minikube. It is therefore required to always use the command `minikube tunnel` within an open Terminal window, in order to create a tunnel from _localhost_ to the cluster endpoints. When this is active, all endpoints can be reached through the defined URLs, which point to 127.0.0.1 and are forwarded to the cluster.|
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |