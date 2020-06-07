#!/bin/bash

set -e

admin_token=""
service_account_id=""
service_account_token=""
result=""

function cleanup {
    echo "Cleaing up..."
    sudo -k
}

function waitForServiceStatus {
    # $1 - serviceUrl
    # $2 - serviceStatus
    status="000"
    while [ $status != $2 ]; do
        echo "Waiting for $1 with status $2"
        sleep 2
        status=$(curl --write-out %{http_code} --silent --output /dev/null $1)
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
        $1
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
    admin_token=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
}

function createServiceAccount {
    read -r -d '' JSON << EOM || true
    {
        "username":"test1@test.de",
        "firstname":"a",
        "lastname":"b",
        "role":"SERVICE_ACCOUNT",
        "status":"ACTIVE",
        "password":"asd",
        "permissions":[
            "all"
        ]
    }
EOM
    postJSON http://iam.localoih.com/api/v1/users "$JSON" "$admin_token"
    service_account_id=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
    echo $service_account_id
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
    service_account_token=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
    echo $service_account_token
}


trap cleanup EXIT

# echo "WARNING: OIH kubernetes setup will be reseted."
# sudo -v

# ###
# ### 1. check for required tools
# ###

# needed_tools=( curl kubectl minikube )
# for i in "${needed_tools[@]}"
# do
# 	if ! type "${i}" > /dev/null; then
#         echo "Please install '${i}' and run this script again"
#         exit 1
#     fi
# done

# ###
# ### 2. setup minikube
# ###

# # restart minikube
# minikube stop
# minikube start --memory 8192 --cpus 4

# # remove oih resources
# kubectl -n oih-dev-ns delete po,svc,pv,pvc --all
# kubectl -n flows delete po,svc,pv,pvc --all

# kubectl delete ns oih-dev-ns || true
# kubectl delete ns flows || true

# minikube addons enable ingress

# ###
# ### 3. insert/update hosts entries
# ###

# ip_address=$(minikube ip)
# host_names=( app-directory.localoih.com iam.localoih.com skm.localoih.com flow-repository.localoih.com auditlog.localoih.com metadata.localoih.com component-repository.localoih.com dispatcher-service.localoih.com webhooks.localoih.com attachment-storage-service.localoih.com data-hub.localoih.com ils.localoih.com web-ui.localoih.com )

# # https://stackoverflow.com/questions/19339248/append-line-to-etc-hosts-file-with-shell-script/37824076#37824076
# for host_name in "${host_names[@]}"
# do
#     # find existing instances in the host file and save the line numbers
#     matches_in_hosts="$(grep -n $host_name /etc/hosts | cut -f1 -d:)"
#     host_entry="${ip_address} ${host_name}"

#     if [ ! -z "$matches_in_hosts" ]
#     then
#         echo "Updating existing hosts entry."
#         # iterate over the line numbers on which matches were found
#         while read -r line_number; do
#             # replace the text of each line with the desired host entry
#             sudo sed -i '' "${line_number}s/.*/${host_entry} /" /etc/hosts
#         done <<< "$matches_in_hosts"
#     else
#         echo "Adding new hosts entry."
#         echo "$host_entry" | sudo tee -a /etc/hosts > /dev/null
#     fi
# done

# # TODO: better check for ingress status READY ?
# waitForServiceStatus "http://$ip_address" "404"

# ###
# ### 4. deploy platform base
# ###

# kubectl apply -f ./1-Platform

# ###
# ### 5. deploy IAM
# ###

# kubectl apply -f ./2-IAM
# waitForServiceStatus "http://iam.localoih.com" "200"

###
### 6. set admin token
###

setAdminToken

echo $admin_token

###
### 7. setup service account
###

createServiceAccount
setServiceAccountToken

###
### 8. replace token in secret and apply settings
###

sed -i -e 's/REPLACE ME/$serviceAccountToken/g' ./SharedSecret

sudo -k