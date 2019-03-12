#!/usr/bin/env bash
kubectl apply -f namespaces.yaml
kubectl apply -f mongodb.yaml
kubectl apply -f rabbitmq.yaml
kubectl apply -f ../services/communication-router/k8s
kubectl apply -f ../services/scheduler/k8s
kubectl apply -f ../services/resource-coordinator/k8s
