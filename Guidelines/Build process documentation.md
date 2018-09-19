
---

**Creator:** Dennis (@dennisCes), Cloud Ecosystem e.V. <br>
**Last Modified:** - <br>
**Last Modifier:** - <br>
**Version:** 0.5  <br>

---

- [Introduction](#introduction)
- [Requirements for mono-repo](#requirements-for-mono-repo)
- [Rules for committing](#rules-for-committing)
- [Build process model](#cicd-process-with-integrated-backlog)



### Introduction

To make sure all committe it seamlessly and independent from each other onto Github, we need a general-accepted build and deploy process. At the end of this file a BPMN model describing the whole process can be found. <br>


### Requirements for mono-repo

In order to be able to build each service independently from each other, the following requirements need to be fulfilled:

* Travis.yaml file in the root folder(openintegrationhub) for all services
* No mongoDB or other tools, those are integrated as docker images in the docker-compose file and will be loaded from the docker page
* Existing "docker-compose.yml"-file
* Existing "package.json"-file (will be automatically created and updated for dependencies after "NPM install")
* Existing "eslintrc.json"-file
* Existing "yarn.lock" in the root folder(openintegrationhub)


### Rules for committing 

* Each committer needs to push her/his code into a new branch
* Each committer needs to fulfill the pre-defined stages as:
  - Install dependencies
  - Test script (yarn)
  - Build script (js)
  - Deploy as Container (js)
  - Integration into kubernetes cluster
* Each build needs to be tagged with the service name and version number (link to dev-guide: command for tagging with name and version"-t...")
  
  
### CI/CD process with integrated backlog

![BuildProcess](https://github.com/openintegrationhub/openintegrationhub/blob/DennisCES-Documentation-Build-Process/CI/CD/Assets/BuildProcess.svg)


