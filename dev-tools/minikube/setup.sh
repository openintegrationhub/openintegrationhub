#!/bin/bash

set -e

# constants

DEV_CONTAINER_IMAGE="openintegrationhub/dev-connector:latest"

HOST_OIH_DIRECTORY="$(dirname $(dirname $(dirname $(readlink -f $0))))"

TENANT_1_NAME="Tenant 1"
TENANT_1_ADMIN="ta1@example.com"
TENANT_1_ADMIN_PASSWORD="1234"
TENANT_1_USER="tu1@example.com"
TENANT_1_USER_PASSWORD="1234"

TENANT_2_NAME="Tenant 2"
TENANT_2_ADMIN="ta2@example.com"
TENANT_2_ADMIN_PASSWORD="1234"
TENANT_2_USER="tu2@example.com"
TENANT_2_USER_PASSWORD="1234"

SERVICE_ACCOUNT_USERNAME=test@test.de
SERVICE_ACCOUNT_PASSWORD=testtest1234

######

EXPOSED_SERVICES=( \
    app-directory.example.com \
    iam.example.com \
    skm.example.com \
    flow-repository.example.com \
    template-repository.example.com \
    auditlog.example.com \
    metadata.example.com \
    component-repository.example.com \
    snapshots-service.example.com \
    dispatcher-service.example.com \
    webhooks.example.com \
    attachment-storage-service.example.com \
    data-hub.example.com \
    ils.example.com \
    web-ui.example.com \
)

REQUIRED_TOOLS=( \
    curl \
    kubectl \
    minikube \
    base64 \
    python3 \
)
# minikube settings

MK_MEMORY=8192
MK_CPUS=4

# Absolute path this script is in
SCRIPTPATH=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

# argument cache
skip_services=()
start_proxy="false"
clear_minikube="false"

# script cache and settings
os=""
cluster_ip="" 
admin_token=""

tenant_1_id=""
tenant_1_admin_id=""
tenant_1_user_id=""

tenant_2_id=""
tenant_2_admin_id=""
tenant_2_user_id=""

service_account_id=""
service_account_token=""
service_account_token_encoded=""

custom_secret_id=""

development_component_id=""
development_private_component_id=""
development_global_component_id=""

result=""

# escape
esc="\e"

function cleanup {
    sudo -k
}

function checkOS {
    unameOut="$(uname -s)"
    case "${unameOut}" in
        Linux*)     os=Linux;;
        Darwin*)    os=Darwin;;
        *)          echo "Unsupported operating system" && exit 1
    esac
    echo "Operating System: $os"
}

function checkMachine {
    unameOut="$(uname -m)"
    case "${unameOut}" in
        arm64*)     machine=ARM;;
        *)          machine="${unameOut}"
    esac
    echo "Machine: $machine"
}

function colorEcho {
    # $1 bash color code
    # $2 text
    echo -e "${esc}[$1m$2${esc}[0m"
}

function checkTools {
    for i in "${REQUIRED_TOOLS[@]}"
    do
        if ! type "${i}" > /dev/null; then
            echo "Please install '${i}' and run this script again"
            exit 1
        fi
    done
}

function updateHostsFile {
    if [ "$os" == "Darwin" ] && [ "$machine" == "ARM" ]; then
        cluster_ip=127.0.0.1
    else
        cluster_ip=$(minikube ip)
    fi

    for host_name in "${EXPOSED_SERVICES[@]}"
    do
        match_in_hosts="$(grep "$host_name" /etc/hosts | cut -f1)"
        host_entry="${cluster_ip} ${host_name}"
        if [ -n "$match_in_hosts" ]
        then
            echo "Updating existing hosts entry: $host_entry"
            updated_hosts=$(python3 -c "import sys;lines=sys.stdin.read();print(lines.replace('$match_in_hosts','$host_entry'))" < /etc/hosts)
            echo "$updated_hosts" | sudo tee /etc/hosts > /dev/null
        else
            echo "Adding new hosts entry: $host_entry"
            echo "$host_entry" | sudo tee -a /etc/hosts > /dev/null
        fi
    done
}

function waitForServiceStatus {
    # $1 - serviceUrl
    # $2 - serviceStatus
    status="000"
    while [ $status != "$2" ]; do
        colorEcho 36 "Waiting for $1"
        sleep 2
        status=$(curl -w "%{http_code}" --silent --output /dev/null "$1")
    done 
}

function waitForPodStatus {
    # $1 - pod regular expression
    pod_status=$(kubectl get pods --all-namespaces || true);
    while [ -z "$(grep "$1" <<< "$pod_status")" ]; do 
        colorEcho 36 "Waiting for $1"
        sleep 2
        pod_status=$(kubectl get pods --all-namespaces || true);
    done
}

function postJSON {
    # $1 - serviceUrl
    # $2 - jsonPayload
    # $3 - Bearer Token
    res=$(curl \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${3}" \
        --silent \
        --show-error \
        --fail \
        --request POST \
        --data "$2" \
        "$1"
    )
    status=$?
    result=$res
}


function setAdminToken {
    read -r -d '' JSON << EOM || true
    {
        "username": "admin@openintegrationhub.com",
        "password": "somestring"
    }
EOM
    postJSON http://iam.example.com/login "$JSON"
    admin_token=$(echo "$result"| python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
}

function createServiceAccount {
    read -r -d '' JSON << EOM || true
    {
        "username":"$SERVICE_ACCOUNT_USERNAME",
        "firstname":"a",
        "lastname":"b",
        "role":"SERVICE_ACCOUNT",
        "status":"ACTIVE",
        "password":"$SERVICE_ACCOUNT_PASSWORD",
        "permissions":[
            "all"
        ]
    }
EOM
    postJSON http://iam.example.com/api/v1/users "$JSON" "$admin_token"
    service_account_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
}

function createTenantAndUsers_1 {
    # create tenant
    read -r -d '' JSON << EOM || true
    {
        "name": "$TENANT_1_NAME",
        "confirmed": true,
        "status": "ACTIVE"
    }
EOM
    postJSON http://iam.example.com/api/v1/tenants "$JSON" "$admin_token"
    tenant_1_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

    # create tenant admin
    read -r -d '' JSON << EOM || true
    {
        "status" : "ACTIVE",
        "confirmed": true,
        "role": "TENANT_ADMIN",
        "permissions": ["all"],
        "username": "$TENANT_1_ADMIN",
        "password": "$TENANT_1_ADMIN_PASSWORD",
        "tenant": "$tenant_1_id"
    }
EOM
    postJSON http://iam.example.com/api/v1/users "$JSON" "$admin_token"
    tenant_1_admin_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
    # create user
    read -r -d '' JSON << EOM || true
    {
        "status" : "ACTIVE",
        "confirmed": true,
        "role": "USER",
        "username": "$TENANT_1_USER",
        "password": "$TENANT_1_USER_PASSWORD",
        "tenant": "$tenant_1_id"
    }
EOM
    postJSON http://iam.example.com/api/v1/users "$JSON" "$admin_token"
    tenant_1_user_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
}

function createTenantAndUsers_2 {
    # create tenant
    read -r -d '' JSON << EOM || true
    {
        "name": "$TENANT_2_NAME",
        "confirmed": true,
        "status": "ACTIVE"
    }
EOM
    postJSON http://iam.example.com/api/v1/tenants "$JSON" "$admin_token"
    tenant_2_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

    # create tenant admin
    read -r -d '' JSON << EOM || true
    {
        "status" : "ACTIVE",
        "confirmed": true,
        "role": "TENANT_ADMIN",
        "permissions": ["all"],
        "username": "$TENANT_2_ADMIN",
        "password": "$TENANT_2_ADMIN_PASSWORD",
        "tenant": "$tenant_2_id"
    }
EOM
    postJSON http://iam.example.com/api/v1/users "$JSON" "$admin_token"
    tenant_2_admin_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
    # create user
    read -r -d '' JSON << EOM || true
    {
        "status" : "ACTIVE",
        "confirmed": true,
        "role": "USER",
        "username": "$TENANT_2_USER",
        "password": "$TENANT_2_USER_PASSWORD",
        "tenant": "$tenant_2_id"
    }
EOM
    postJSON http://iam.example.com/api/v1/users "$JSON" "$admin_token"
    tenant_2_user_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
}

function setServiceAccountToken {
    read -r -d '' JSON << EOM || true
    {
        "accountId": "$service_account_id",
        "expiresIn": -1,
        "initiator": "$service_account_id",
        "inquirer": "$service_account_id"
    }
EOM
    postJSON http://iam.example.com/api/v1/tokens "$JSON" "$admin_token"
    service_account_token=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
}

function addTokenToSecret {
    if [ "$os" == "Linux" ]; then
        service_account_token_encoded=$(echo -n "$service_account_token" | base64 -w0)
    else
        service_account_token_encoded=$(echo -n "$service_account_token" | base64)
    fi

    new_secret=$(python3 -c "import sys;lines=sys.stdin.read();print(lines.replace('REPLACE ME','$service_account_token_encoded'))" < ./3-Secret/SharedSecret.yaml)
    echo "$new_secret" > ./3-Secret/SharedSecret.yaml
}

function removeTokenFromSecret {
    new_secret=$(python3 -c "import sys;lines=sys.stdin.read();print(lines.replace('$service_account_token_encoded','REPLACE ME'))" < ./3-Secret/SharedSecret.yaml)
    echo "$new_secret" > ./3-Secret/SharedSecret.yaml
}

function deployIAM {
        IFS=' '
        service_name="iam"
        kubectl apply -f "./2-IAM/IAMSecret.yaml"
        if [[ " ${from_source[*]} " == *" $service_name "* ]]
        then
            colorEcho 35 "Deploy $service_name from source"
            kubectl apply -f "./2-IAM/sourceDeploy.yaml"
        else
            colorEcho 32 "Deploy $service_name"
            kubectl apply -f "./2-IAM/containerDeploy.yaml"
        fi
        kubectl apply -f "./2-IAM/service.yaml"
}

function deployServices {
    for dir in ./4-Services/*
    do
        IFS=' '
        service_name=$(echo "$dir" | sed "s/.\/4-Services\///")
        temp_tag=""
        color_tag=32
        if [[ " ${skip_services[*]} " == *" $service_name "* ]]
        then
            color_tag=33
            temp_tag="(temporary)"
        fi
        if [[ " ${from_source[*]} " == *" $service_name "* ]]
        then
            colorEcho 35 "Deploy $service_name from source"
            kubectl apply -f "$dir/sourceDeploy.yaml"
        else
            colorEcho $color_tag "Deploy $service_name $temp_tag"
            kubectl apply -f "$dir/containerDeploy.yaml"
        fi
        if [ -f "$dir/service.yaml" ]
        then
            kubectl apply -f "$dir/service.yaml"
        fi
    done
}

function sourceInstall {
    rootdir="$(dirname $(dirname $(pwd)))" 
    for service in "${from_source[@]}"
    do
        colorEcho 34 "Installing deps for $service"
        npm install --prefix $rootdir -w "$service" 
    done
}

function removeTemporaryServices {
    for dir in ./4-Services/*
    do
        IFS=' '
        service_name=$(echo "$dir" | sed "s/.\/4-Services\///")
        if [[ " ${skip_services[*]} " == *" $service_name "* ]]
        then
            colorEcho 33 "Removing $service_name"
            kubectl -n oih-dev-ns delete services "$service_name" || true
            kubectl -n oih-dev-ns delete deployment "$service_name" || true
        fi
    done
}

function createCustomSecret {
    read -r -d '' JSON << EOM || true
    {
        "data": {
            "name": "custom_secret",
            "type": "MIXED",
            "value": {
                "payload": "secret"
            }
        }
    }
EOM
    postJSON http://skm.example.com/api/v1/secrets "$JSON" "$admin_token"
    custom_secret_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])")
    echo "$custom_secret_id"
}

function createDevComponent {
    read -r -d '' JSON << EOM || true
    {
        "distribution": {
            "type": "docker",
            "image": "$DEV_CONTAINER_IMAGE"
        },
        "access": "public",
        "name": "Development Component",
        "description": "A component just for testing"
    }
EOM
    postJSON http://component-repository.example.com/components "$JSON" "$admin_token"
    development_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createDevPrivateComponent {
    read -r -d '' JSON << EOM || true
    {
        "distribution": {
            "type": "docker",
            "image": "$DEV_CONTAINER_IMAGE"
        },
        "access": "private",
        "name": "Development Component (Private)",
        "description": "A component just for testing",
        "owners": [
            {
                "id": "$tenant_2_user_id",
                "type": "user"
            }
        ]
    }
EOM
    postJSON http://component-repository.example.com/components "$JSON" "$admin_token"
    development_private_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createDevGlobalComponent {
    read -r -d '' JSON << EOM || true
    {
        "distribution": {
            "type": "docker",
            "image": "$DEV_CONTAINER_IMAGE"
        },
        "access": "public",
        "isGlobal": true,
        "name": "Global Development Component",
        "description": "A component just for testing"
    }
EOM
    postJSON http://component-repository.example.com/components "$JSON" "$admin_token"
    development_global_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createDevSimpleFlow {
    read -r -d '' JSON << EOM || true
    {
        "name":"Simplest flow (single component)",
        "description:": "just one component",
        "graph":{
            "nodes":[
                {
                    "id": "step_1",
                    "componentId": "$development_component_id",
                    "function": "testTrigger"
                }
            ],
            "edges":[
            ]
        },
        "cron":"*/1 * * * *"
    }
EOM
    postJSON http://flow-repository.example.com/flows "$JSON" "$admin_token"
}

function createDevWebhookFlow {
    read -r -d '' JSON << EOM || true
    {
        "name":"Simple flow with local and global components (webhook)",
        "description:": "just one component",
        "graph":{
            "nodes":[
                {
                    "id": "step_1",
                    "componentId": "$development_component_id",
                    "function": "testTrigger",
                    "credentials_id": "$custom_secret_id",
                    "fields":{
                        "code":"async function run() { console.log('running async function1');}"
                    }
                },
                {
                    "id": "step_2",
                    "componentId": "$development_global_component_id",
                    "function": "testAction",
                    "credentials_id": "$custom_secret_id",
                    "fields":{
                        "code":"async function run() { console.log('running async function2');}"
                    }
                },
                {
                    "id": "step_3",
                    "componentId": "$development_component_id",
                    "function": "testAction",
                    "credentials_id": "$custom_secret_id",
                    "fields":{
                        "code":"async function run() { console.log('running async function3');}"
                    }
                },
                {
                    "id": "step_4",
                    "componentId": "$development_global_component_id",
                    "function": "testAction",
                    "credentials_id": "$custom_secret_id",
                    "fields":{
                        "code":"async function run() { console.log('running async function4');}"
                    }
                }
            ],
            "edges":[
                {
                    "source": "step_1",
                    "target": "step_2"
                },
                {
                    "source": "step_1",
                    "target": "step_3"
                },
                {
                    "source": "step_3",
                    "target": "step_4"
                }
            ]
        }
    }
EOM
    postJSON http://flow-repository.example.com/flows "$JSON" "$admin_token"
}

function createDevConsecutiveFlow {
    read -r -d '' JSON << EOM || true
    {
        "name": "LocalDevFlow (Consecutive)",
        "graph": {
            "nodes": [
                {
                    "id": "step_1",
                    "componentId": "$development_component_id",
                    "function": "testTrigger"
                },
                {
                    "id": "step_2",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_3",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                }
            ],
            "edges": [
                {
                    "source": "step_1",
                    "target": "step_2"
                },
                {
                    "source": "step_2",
                    "target": "step_3"
                }
            ]
        },
        "cron": "*/1 * * * *"
    }
EOM
    postJSON http://flow-repository.example.com/flows "$JSON" "$admin_token"
}

function createDevGlobalConsecutiveFlow {
    read -r -d '' JSON << EOM || true
    {
        "name": "GlobalDevFlow (Consecutive)",
        "graph": {
            "nodes": [
                {
                    "id": "step_1",
                    "componentId": "$development_global_component_id",
                    "function": "testTrigger"
                },
                {
                    "id": "step_2",
                    "componentId": "$development_global_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_3",
                    "componentId": "$development_global_component_id",
                    "function": "testAction"
                }
            ],
            "edges": [
                {
                    "source": "step_1",
                    "target": "step_2"
                },
                {
                    "source": "step_2",
                    "target": "step_3"
                }
            ]
        }
    }
EOM
    postJSON http://flow-repository.example.com/flows "$JSON" "$admin_token"
}

function createDevConcurrentFlow {
    read -r -d '' JSON << EOM || true
    {
        "name": "LocalDevFlow (Concurrent)",
        "graph": {
            "nodes": [
                {
                    "id": "step_1",
                    "componentId": "$development_component_id",
                    "function": "testTrigger"
                },
                {
                    "id": "step_2",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_3",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                }
            ],
            "edges": [
                {
                    "source": "step_1",
                    "target": "step_2"
                },
                {
                    "source": "step_1",
                    "target": "step_3"
                }
            ]
        },
        "cron": "*/1 * * * *"
    }
EOM
    postJSON http://flow-repository.example.com/flows "$JSON" "$admin_token"
}

function createDevGlobalFlow {
    read -r -d '' JSON << EOM || true
    {
        "name": "LocalDevFlow with global component (Concurrent)",
        "graph": {
            "nodes": [
                {
                    "id": "step_1",
                    "componentId": "$development_component_id",
                    "function": "testTrigger"
                },
                {
                    "id": "step_2",
                    "componentId": "$development_global_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_3",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_4",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_5",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_6",
                    "componentId": "$development_global_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_7",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_8",
                    "componentId": "$development_global_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_9",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                },
                {
                    "id": "step_10",
                    "componentId": "$development_component_id",
                    "function": "testAction"
                }
            ],
            "edges": [
                {
                    "source": "step_1",
                    "target": "step_2"
                },
                {
                    "source": "step_1",
                    "target": "step_3"
                },
                {
                    "source": "step_2",
                    "target": "step_4"
                },
                {
                    "source": "step_2",
                    "target": "step_5"
                },
                {
                    "source": "step_3",
                    "target": "step_6"
                },
                {
                    "source": "step_3",
                    "target": "step_7"
                },
                {
                    "source": "step_7",
                    "target": "step_8"
                },
                {
                    "source": "step_7",
                    "target": "step_9"
                },
                {
                    "source": "step_7",
                    "target": "step_10"
                }
            ]
        }
    }
EOM
    postJSON http://flow-repository.example.com/flows "$JSON" "$admin_token"
}

function writeDotEnvFile {
    echo "export IAM_TOKEN=$service_account_token" > "$SCRIPTPATH"/.env
}

function startProxy {
    if [ "$start_proxy" == "true" ]; then
        kubectl -n oih-dev-ns port-forward service/mongodb-service 27017:27017 &
        kubectl -n oih-dev-ns port-forward service/rabbitmq-service 15672:15672 &
        kubectl -n oih-dev-ns port-forward service/rabbitmq-service 5672:5672 &
        kubectl -n oih-dev-ns port-forward service/redis-service 6379:6379 &
    fi
}

function clearMinikube {
    if [ "$clear_minikube" == "true" ]; then
        minikube delete
    fi
}

trap cleanup EXIT

checkOS

checkMachine

if [ "$os" == "Darwin" ]; then
    esc="\x1B"
fi

# check arguments

while getopts "cs:i:d:p" option 
do 
    case "${option}" 
    in 
    # -c clear minikuke
    c)  clear_minikube="true"
        colorEcho 32 "- clear minikube";;
    # -s [serviceName,..] remove service deployments after setup is done
    s)  IFS=', ' read -r -a skip_services <<< "${OPTARG}"
        colorEcho 32 "- skip deployments: ${skip_services[*]}";;
    # -i imageName use custom image for development component
    i)  IFS='' read -r DEV_CONTAINER_IMAGE <<< "${OPTARG}"
        colorEcho 32 "- use custom image '$DEV_CONTAINER_IMAGE' for dev component";;
    # -p proxy dbs and message queue
    d)  IFS=', ' read -r -a from_source <<< "${OPTARG}"
        colorEcho 32 "- develop from source: ${from_source[*]}";;
    p)  start_proxy="true"
        colorEcho 32 "- start proxy";;
    *) ;;
    esac 
done 

# preserve newlines in substitutions
IFS=

echo "WARNING: OIH kubernetes setup will be restored."
sudo -v

###
### 1. check for required tools
###

checkTools

###
### 2. setup minikube
###

clearMinikube

if [ "$os" == "Darwin" ]; then
    if [ "$machine" == "ARM" ]; then
        minikube start --driver=docker --memory $MK_MEMORY --cpus $MK_CPUS --mount=true --mount-string="${HOST_OIH_DIRECTORY}:/openintegrationhub"
    else 
        minikube start --driver=hyperkit --vm=true --memory $MK_MEMORY --cpus $MK_CPUS
    fi
else
    minikube start --memory $MK_MEMORY --cpus $MK_CPUS
fi

###
### 2a. If services will be loaded for development from source, build the NFS share
### This script traverses two levels up from the /minikube folder, thus landing in the project root
###
if [ -n "${from_source}" ]
then
    nfs_script="$(dirname $(dirname $(pwd))) -alldirs -mapall="$(id -u)":"$(id -g)" $(minikube ip)"
    if [ -z "$(grep ${nfs_script} /etc/exports)" ]
    then 
        echo "${nfs_script}" | sudo tee -a /etc/exports && sudo nfsd restart
    fi
fi

#minikube addons enable ingress
minikube addons enable dashboard
minikube addons enable metrics-server
#if [ "$os" == "Darwin" ] && [ "$machine" == "ARM" ]; then
#    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/cloud/deploy.yaml
#else
    minikube addons enable ingress
#fi

# remove oih resources
kubectl -n oih-dev-ns delete pods,services,deployments --all
kubectl -n oih-dev-ns delete pvc --all
kubectl delete pv local-volume || true
kubectl delete pv source-volume || true
kubectl delete ns oih-dev-ns || true

kubectl -n flows delete pods,services,deployments --all
kubectl delete ns flows || true

###
### 3. insert/update hosts entries
###

updateHostsFile

waitForPodStatus ingress-nginx-controller.*1/1

if [ "$os" == "Darwin" ] && [ "$machine" == "ARM" ]; then
    minikube tunnel &
fi
###
### 4. deploy platform base
###

kubectl apply -f ./1-Platform
if [ "$os" == "Darwin" ] && [ "$machine" == "ARM" ]; then
    config_file="./1.1-CodeVolume/sourceCodeVolumeARM.yaml"
else
    config_file="./1.1-CodeVolume/sourceCodeVolume.yaml"
fi
sed -i "s|\(.*path:\).*|\1 \"$HOST_OIH_DIRECTORY\"|" $config_file
kubectl apply -f $config_file
kubectl apply -f ./1.2-CodeClaim

waitForPodStatus mongodb.*1/1
waitForPodStatus rabbitmq.*1/1
waitForPodStatus redis.*1/1

###run npm install on any local code services
sourceInstall

###
### 5. deploy IAM
###
deployIAM
waitForServiceStatus http://iam.example.com 200

###
### 6. set admin token
###

setAdminToken

###
### 7a. create accounts
###

createTenantAndUsers_1
createTenantAndUsers_2

###
### 7b. setup service account
###

createServiceAccount
setServiceAccountToken

###
### 8. replace token in secret and apply settings
###

addTokenToSecret
kubectl apply -f ./3-Secret
removeTokenFromSecret

###
### 9. deploy framework services
###

deployServices
# kubectl apply -Rf ./4-Services

###
### 10. create custom secret
###

waitForServiceStatus http://skm.example.com/api/v1/secrets 401
createCustomSecret

###
### 11. add example components and flow
###

waitForServiceStatus http://component-repository.example.com/components 401

createDevComponent

# create multiple global components
createDevGlobalComponent
createDevGlobalComponent

# create for tenant_2_user_id
createDevPrivateComponent

waitForServiceStatus http://flow-repository.example.com/flows 401

echo "Flow Ready"
createDevSimpleFlow
echo "Created Simple Flow"
createDevWebhookFlow
echo "Created Webhook Flow"
createDevGlobalConsecutiveFlow
echo "created global consecutive flow"
createDevConsecutiveFlow
echo "created consecutive local flow"
createDevConcurrentFlow
echo "created concurrent flow"
createDevGlobalFlow
echo "created global flow"

###
### 12. Point to web ui if ready
###

waitForServiceStatus http://web-ui.example.com 200

###
### 13. Remove temporary deployments
###

removeTemporaryServices

###
### 14. Write .env file
###

writeDotEnvFile

###
### 15. Print pod status
###

kubectl -n oih-dev-ns get pods

###
### 16. Proxy db and queue connections
###

startProxy

###
### 17. Open dashboard
###

# end sudo session
sudo -k

minikube dashboard
