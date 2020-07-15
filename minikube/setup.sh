#!/bin/bash

set -e

# constants

SERVICE_ACCOUNT_USERNAME=test@test.de
SERVICE_ACCOUNT_PASSWORD=testtest1234

EXPOSED_SERVICES=( \
    app-directory.localoih.com \
    iam.localoih.com \
    skm.localoih.com \
    flow-repository.localoih.com \
    auditlog.localoih.com \
    metadata.localoih.com \
    component-repository.localoih.com \
    snapshots-service.localoih.com \
    dispatcher-service.localoih.com \
    webhooks.localoih.com \
    attachment-storage-service.localoih.com \
    data-hub.localoih.com \
    ils.localoih.com \
    web-ui.localoih.com \
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

skip_services=()
# check arguments

while [ "$1" != "" ]; do
    case $1 in
        -s | --skip )           shift
                                IFS=', ' read -r -a skip_services <<< "$1"
                                echo "Will skip following deployments: ${skip_services[*]}"
                                ;;
    esac
    shift
done

# preserve newlines in substitutions
IFS=

# script cache
os=""
cluster_ip=""
admin_token=""
service_account_id=""
service_account_token=""
service_account_token_encoded=""

timer_component_id=""
node_component_id=""

development_component_id=""

result=""




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
    cluster_ip=$(minikube ip)

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
        echo "Waiting for $1"
        sleep 2
        status=$(curl -w "%{http_code}" --silent --output /dev/null "$1")
    done 
}

function waitForPodStatus {
    pod_status=$(kubectl get pods --all-namespaces || true);
    while [ -z "$(grep "$1" <<< "$pod_status")" ]; do 
        echo "Waiting for $1..."
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
    postJSON http://iam.localoih.com/login "$JSON"
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
    postJSON http://iam.localoih.com/api/v1/users "$JSON" "$admin_token"
    service_account_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
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
    postJSON http://iam.localoih.com/api/v1/tokens "$JSON" "$admin_token"
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

function createTimerComponent {
    read -r -d '' JSON << EOM || true
    {
        "data": {
            "distribution":{
                "type":"docker",
                "image":"elasticio/timer:ca9a6fea391ffa8f7c8593bd2a04143212ab63f6"
            },
            "access":"public",
            "name":"Timer",
            "description":"Timer component that periodically triggers flows on a given interval"
        }
    }
EOM
    postJSON http://component-repository.localoih.com/components "$JSON" "$admin_token"
    timer_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createNodeComponent {
    read -r -d '' JSON << EOM || true
    {
        "data": {
            "distribution": {
                "type": "docker",
                "image": "elasticio/code-component:7bc2535df2f8a35c3653455e5becc701b010d681"
            },
            "access": "public",
            "name": "Node.js code",
            "description": "Node.js code component that executes the provided code"
        }
    }
EOM
    postJSON http://component-repository.localoih.com/components "$JSON" "$admin_token"
    node_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createDevComponent {
    read -r -d '' JSON << EOM || true
    {
        "data": {
            "distribution": {
                "type": "docker",
                "image": "oih/connector:latest"
            },
            "access": "public",
            "name": "Development Component",
            "description": "Expects image 'oih/connector:latest' in docker minikube environment and local Component Orchestrator running with 'KUBERNETES_IMAGE_PULL_POLICY=Never'"
        }
    }
EOM
    postJSON http://component-repository.localoih.com/components "$JSON" "$admin_token"
    development_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createFlow {
    read -r -d '' JSON << EOM || true
    {
        "name":"Timer To Code Component Example",
        "description:": "This flow periodically triggers the flow and sends request to webhook.site",
        "graph":{
            "nodes":[
                {
                "id":"step_1",
                "componentId":"$timer_component_id",
                "function":"timer"
                },
                {
                "id":"step_2",
                "componentId":"$node_component_id",
                "function":"execute",
                "fields":{
                    "code":"function* run() {console.log('Calling external URL');yield request.post({uri: 'ADD WEBHOOK URL HERE', body: msg, json: true});}"
                }
                }
            ],
            "edges":[
                {
                "source":"step_1",
                "target":"step_2"
                }
            ]
        },
        "cron":"*/2 * * * *"
    }
EOM
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
}

function createDevFlow {
    read -r -d '' JSON << EOM || true
    {
        "name": "LocalDevFlow",
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
                    "function": "testTrigger"
                }
            ],
            "edges": [
                {
                    "source": "step_1",
                    "target": "step_2"
                }
            ]
        },
        "cron": "*/2 * * * *"
    }
EOM
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
}

trap cleanup EXIT

echo "WARNING: OIH kubernetes setup will be restored."
sudo -v

###
### 1. check for required tools
###

checkTools
checkOS

###
### 2. setup minikube
###
minikube start --memory $MK_MEMORY --cpus $MK_CPUS
minikube addons enable ingress
minikube addons enable dashboard

# remove oih resources
kubectl -n oih-dev-ns delete pods,services,deployments --all
kubectl -n oih-dev-ns delete pvc --all
kubectl delete pv local-volume || true
kubectl delete ns oih-dev-ns || true

kubectl -n flows delete pods,services,deployments --all
kubectl delete ns flows || true

###
### 3. insert/update hosts entries
###

updateHostsFile

waitForPodStatus ingress-nginx-controller.*1/1

###
### 4. deploy platform base
###

kubectl apply -f ./1-Platform

waitForPodStatus mongodb.*1/1
waitForPodStatus rabbitmq.*1/1
waitForPodStatus redis.*1/1

###
### 5. deploy IAM
###

kubectl apply -f ./2-IAM
waitForServiceStatus http://iam.localoih.com 200

###
### 6. set admin token
###

setAdminToken

###
### 7. setup service account
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

kubectl apply -Rf ./4-Services

###
### 10. add example components and flow
###

waitForServiceStatus http://component-repository.localoih.com/components 401
createTimerComponent
createNodeComponent
createDevComponent

waitForServiceStatus http://flow-repository.localoih.com/flows 401
createFlow
createDevFlow

###
### 11. Point to web ui if ready
###

waitForServiceStatus http://web-ui.localoih.com 200
echo "Service account token: $service_account_token"
echo "Setup done. Visit -> http://web-ui.localoih.com"

###
### 12. Open dashboard
###

# end sudo session
sudo -k

minikube dashboard