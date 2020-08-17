#!/bin/bash

set -e

# constants

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

# Absolute path this script is in, thus /home/user/bin
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

timer_component_id=""
node_component_id=""

development_component_id=""
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

function createTenantAndUsers_1 {
    # create tenant
    read -r -d '' JSON << EOM || true
    {
        "name": "$TENANT_1_NAME",
        "confirmed": true,
        "status": "ACTIVE"
    }
EOM
    postJSON http://iam.localoih.com/api/v1/tenants "$JSON" "$admin_token"
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
    postJSON http://iam.localoih.com/api/v1/users "$JSON" "$admin_token"
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
    postJSON http://iam.localoih.com/api/v1/users "$JSON" "$admin_token"
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
    postJSON http://iam.localoih.com/api/v1/tenants "$JSON" "$admin_token"
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
    postJSON http://iam.localoih.com/api/v1/users "$JSON" "$admin_token"
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
    postJSON http://iam.localoih.com/api/v1/users "$JSON" "$admin_token"
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

function deployServices {
    for dir in ./4-Services/*
    do
        IFS=' '
        service_name=$(echo "$dir" | sed "s/.\/4-Services\///")
        if [[ " ${skip_services[*]} " == *" $service_name "* ]]
        then
            colorEcho 33 "Deploy $service_name (temporary)"
        else
            colorEcho 32 "Deploy $service_name"
        fi
        kubectl apply -Rf "$dir"
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

function createDevPrivateComponent {
    read -r -d '' JSON << EOM || true
    {
        "data": {
            "distribution": {
                "type": "docker",
                "image": "oih/connector:latest"
            },
            "access": "private",
            "name": "Development Component (Private)",
            "description": "Expects image 'oih/connector:latest' in docker minikube environment and local Component Orchestrator running with 'KUBERNETES_IMAGE_PULL_POLICY=Never'",
            "owners": [
                {
                    "id": "$tenant_2_user_id",
                    "type": "user"
                }
            ]
        }
    }
EOM
    postJSON http://component-repository.localoih.com/components "$JSON" "$admin_token"
    development_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
}

function createDevGlobalComponent {
    read -r -d '' JSON << EOM || true
    {
        "data": {
            "distribution": {
                "type": "docker",
                "image": "oih/connector:latest"
            },
            "access": "public",
            "isGlobal": true,
            "name": "Global Development Component",
            "description": "Expects image 'oih/connector:latest' in docker minikube environment and local Component Orchestrator running with 'KUBERNETES_IMAGE_PULL_POLICY=Never'"
        }
    }
EOM
    postJSON http://component-repository.localoih.com/components "$JSON" "$admin_token"
    development_global_component_id=$(echo "$result" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
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
        "cron":"*/1 * * * *"
    }
EOM
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
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
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
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
                    "componentId": "$development_global_component_id",
                    "function": "testAction"
                }
            ],
            "edges":[
                {
                    "source": "step_1",
                    "target": "step_2"
                },
                {
                    "source": "step_2",
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
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
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
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
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
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
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
    postJSON http://flow-repository.localoih.com/flows "$JSON" "$admin_token"
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

if [ "$os" == "Darwin" ]; then
    esc="\x1B"
fi

# check arguments

while getopts "cs:p" option 
do 
    case "${option}" 
    in 
    c)  clear_minikube="true"
        colorEcho 32 "- clear minikube";;
    s)  IFS=', ' read -r -a skip_services <<< "${OPTARG}"
        colorEcho 32 "- skip deployments: ${skip_services[*]}";;
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

minikube start --memory $MK_MEMORY --cpus $MK_CPUS
minikube addons enable ingress
minikube addons enable dashboard
minikube addons enable metrics-server

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
### 10. add example components and flow
###

waitForServiceStatus http://component-repository.localoih.com/components 401
createTimerComponent
createNodeComponent
createDevComponent
createDevGlobalComponent

# create for tenant_2_user_id
createDevPrivateComponent

waitForServiceStatus http://flow-repository.localoih.com/flows 401

createFlow

createDevSimpleFlow
createDevWebhookFlow
createDevConsecutiveFlow
createDevConcurrentFlow
createDevGlobalFlow

###
### 11. Remove temporary deployments
###

removeTemporaryServices

###
### 12. Point to web ui if ready
###

waitForServiceStatus http://web-ui.localoih.com 200
echo "Setup done. Visit -> http://web-ui.localoih.com"

###
### 13. Write .env file
###

writeDotEnvFile

###
### 14. Print pod status
###

kubectl -n oih-dev-ns get pods

###
### 15. Proxy db and queue connections
###

startProxy

###
### 16. Open dashboard
###

# end sudo session
sudo -k

minikube dashboard