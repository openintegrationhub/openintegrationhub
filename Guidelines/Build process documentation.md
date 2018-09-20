
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
For further information regarding different docker build, pipelines, kubernetes service defintions, monitoring or scaling, please have a look at our [devOps guidelines](https://github.com/openintegrationhub/openintegrationhub/blob/DevOps-Guideline/Guidelines/serviceOperations.md).   


### Requirements for mono-repo

In order to be able to build each service independently from each other, the following requirements need to be fulfilled:

* Travis.yaml file in the root folder(openintegrationhub) for all services
* No mongoDB or other tools, those are integrated as docker images in the docker-compose file and will be loaded from the docker page
* Existing "docker-compose.yml"-file
* Existing "package.json"-file (will be automatically created and updated for dependencies after "NPM install")
* Existing "eslintrc.json"-file
* Existing "yarn.lock" in the root folder(openintegrationhub)

For a better understanding, you can check out our ["Identity and Access Management"-microservice](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam)


### Rules for committing 

* Each committer needs to push her/his code into a new branch
* Each committer needs to fulfill the pre-defined stages as:
  - Install dependencies
  - Test script (yarn)
  - Build script (js)
  - Deploy as Container (js)
  - Integration into kubernetes cluster
* Each docker build needs to be tagged with the service name and version number as it can be seen here: [devOps guidelines](https://github.com/openintegrationhub/openintegrationhub/blob/DevOps-Guideline/Guidelines/serviceOperations.md)
  
  
### CI/CD process with integrated backlog

The continuous integration- and deployment process starts with the commit from each of the developers, selecting current issues to fix, followed by the local unit testing on those. After successful local tests and as declared in the requirements for committing, a new branch is always necessary for committing in the openintegrationhub repository. 
TravisCI will be triggered automatically by active changes in these branches and the services subfolder. It will start the scripts from the yaml-file, installing the dependencies and packages for all stages: test-, build-, deploy- and integration. Whenever a stage fails the error log will be created automatically and the CES team adds, assignes and prioritize those logs as new issues in the backlog for the developers.


![BuildProcess](https://github.com/openintegrationhub/openintegrationhub/blob/DennisCES-Documentation-Build-Process/CI/CD/Assets/BuildProcess.svg)


