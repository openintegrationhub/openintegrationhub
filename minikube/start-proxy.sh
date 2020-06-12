#!/bin/bash

set -e

kubectl -n oih-dev-ns port-forward service/mongodb-service 27017:27017 &
kubectl -n oih-dev-ns port-forward service/rabbitmq-service 15672:15672 &
kubectl -n oih-dev-ns port-forward service/rabbitmq-service 5672:5672 &
kubectl -n oih-dev-ns port-forward service/redis-service 6379:6379