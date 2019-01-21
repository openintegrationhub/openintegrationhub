#!/bin/bash

set -e
if [ ! -d "$HOME/google-cloud-sdk/bin" ]
then
    rm -rf $HOME/google-cloud-sdk
    export CLOUDSDK_CORE_DISABLE_PROMPTS=1
    curl https://sdk.cloud.google.com | bash > /dev/null
    source $HOME/google-cloud-sdk/path.bash.inc
fi

echo $GCLOUD_SERVICE_KEY | base64 --decode -i > ${HOME}/gcloud-service-key.json
gcloud auth activate-service-account --key-file ${HOME}/gcloud-service-key.json

gcloud --quiet config set project galvanic-veld-209811
gcloud --quiet config set container/cluster oih-production-v1
gcloud --quiet config set compute/zone europe-west3-c
gcloud components install kubectl
gcloud --quiet container clusters get-credentials oih-production-v1
echo 'Get Access to Cluster'
kubectl config view
echo 'Set Default Cluster Context'
kubectl config current-context
