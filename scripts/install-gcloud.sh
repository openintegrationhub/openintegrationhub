#!/bin/bash

set -e

echo $GCLOUD_SERVICE_KEY | base64 --decode -i > ${HOME}/gcloud-service-key.json
gcloud auth activate-service-account --key-file ${HOME}/gcloud-service-key.json

gcloud --quiet config set project galvanic-veld-209811
gcloud --quiet config set container/cluster oih-v1
gcloud --quiet config set compute/zone europe-west3-c
gcloud components install kubectl
gcloud --quiet container clusters get-credentials oih-v1

kubectl config view
kubectl config current-context

