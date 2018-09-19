
---

**Creator:** Dennis (@dennisCes), Cloud Ecosystem e.V. <br>
**Last Modified:** - <br>
**Last Modifier:** - <br>
**Version:** 0.5  <br>

---

<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Introduction](#introduction)
- [Requirements for the mono-repo](#requirements-for-the-mono-repo)
- [Requirements for committs](#requirements-for-committs)
- [BPMN Model](#bpmn-model)

<!-- /TOC -->

### Introduction

To make sure all commiter are able to committ seamlessly and independent from each other onto Github, we need a general-accepted build and deploy process. At the end of this file a BPMN model describing the whole process can be found. <br>


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
* Each committer needs to create this branch in the corresponding "services" subfolder
* Each committer needs to fulfill the pre-defined stages as:
  - Install dependencies
  - Test script (yarn)
  - Build script (js)
  - Deploy as Container (js)
  - Integration into kubernetes cluster
* Each build needs to be tagged with the service name and version number (link to dev-guide: command for tagging with name and version"-t...")
  
  
### BMPN model: Continuous integration & deployment process with integrated backlog(CES)

  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/DennisCES-Documentation-Build-Process/CI/CD/Assets/BuildProcess.svg" alt="mm"/>


