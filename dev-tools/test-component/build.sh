#!/bin/bash

eval $(minikube docker-env)
docker build -t oih/test-component .
