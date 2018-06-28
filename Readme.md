# OIH microservices
Standalone platform that runs flows build from [elastic.io](https://www.elastic.io/) components on kuberntes. Components are build around [nodejs library](https://github.com/elasticio/sailor-nodejs) or [java library](https://github.com/elasticio/sailor-jvm). Generally components may be build with any other language and technology that can work with amqp protocol, send http requests, has access to process's env variables and may be packed into docker container. 

## Platform requirements: 
* Any kubernetes cluster (GCP/minikube/bare-metal cluster/whatwever). The only requirement is network access to docker hub registry.
* kubectl command installed and configured to work with kubernetes cluster.

## Installation
The whole platform is described as one json file with a set of kubernetes descriptors. To install (reinstall) platform:
1. Clean out previous installation if required
```shell
kubectl delete -f platform/platform.json
```
2. Install platform
```shell
kubectl create -f platform/platform.json
```
Same actions may be done using kubernetes dashboard.
After installation kubernetes cluster should contain deployments and theirs pods.
Their startup may take some time (to download docker images and to start). To check if everything has been started up:

Get deployments
```shell
kubectl get deployments --namespace=platform
```
```
NAME             DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
flows-operator   1         1         1            1           27m
rabbitmq         1         1         1            1           27m
scheduler        1         1         1            1           27m
communication-router         1         1         1            1           27m
```
And their pods
```shell
kubectl get pods --namespace=platform
```
```
NAME                              READY     STATUS    RESTARTS   AGE
flows-operator-576fb76f65-b86rr   1/1       Running   0          27m
rabbitmq-5c5c7ffd4-6g2gb          1/1       Running   0          27m
scheduler-5d84c698d4-hxb65        1/1       Running   0          27m
communication-router-6d4d575967-4nsbd         1/1       Running   0          27m
```
## Usage
To make platform to do somthing usefull, it's required do create flow in kubernetes cluster. Platform will start appropriate pods, and glue them together using amqp. Flows are defined as kubernetes' custom resources. Examples are given in repository `example/flow.json` and `example/flow2.json`

### Start flow
Next command will start flow defined in `example/flow.json` file. That example flow periodically sends email to address defined in it's configuration
```shell
kubectl create -f example/flow.json
```
Multiple different flows may be stared simultaneously. The only limit is cluster resources.

### Delete flow
```shell
kubectl delete -f example/flow.json
```
Or
```shell
kubectl delete flow --namespace=flows <PLACE_ID_OF_YOUR_FLOW_HERE>
```

### List flows
```shell
kubectl get flows --namespace=flows
```

### Send message into communication-router
Get service uri
```shell
kubectl get services communication-router-service  --namespace=platform 
```
```
NAME               TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE                                                                          communication-router-service   NodePort   10.102.67.33   <none>        1234:30204/TCP   36m 
```
In case of minikube 
```shell
minikube service -n platform --url communication-router-service
```
```
http://192.168.39.24:30204
```
Actually send message
```shell
curl '<SERVICE_URL>/flow/<FLOW_ID>?arg1=val1&arg2=val2'
curl -H 'Content-Type: application/json' '<SERVICE_URL>/flow/<FLOW_ID>' -d '{"arg1": "val1", "arg2": "val2"}'
```

### Debug
Flow steps are mapped to kubernetes jobs. So to see if flow steps are really running it's possible to 
1. get list of jobs
```shell
kubectl get jobs --namespace=flows
```
2. get list of pods 
```shell
kubectl get pods --namespace=flows
```

## Flow format
Flow is defined as [kubernetes custom resorce](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/). Such custom resource defines a tree/graph like structure of interlinked components. The whole flow is build with event-based architecture. Componentes (which are graph nodes) sends messages to other components along graph edges. So flow is basically just a graph in form of [adjacency list](https://en.wikipedia.org/wiki/Adjacency_list). As source of events into first step of flow platform provides scheduler and communication-router services. Scheduler periodically send events to fist component in flow (isPolling should equal true in first step). Communication router service listens http and forwards http requests into first step of flow (isPolling should equal to false in first step). If some custom source of events is required, it's possible to create custom component that decides by itself, when and what messages should be sent to next steps.

### Example/details
```json
{
    "apiVersion": "elastic.io/v1",
    "kind": "Flow",
    "metadata": {
        "name": "example-task",
        "namespace": "flows"
    },
    "spec": {
        "nodes": [
            {
                "image": "elasticio/timer:ca9a6fea391ffa8f7c8593bd2a04143212ab63f6",
                "id": "step_1",
                "function": "timer",
                "first": true,
                "isPolling": false,
                "data": {
                    "interval": "minute"
                },
            },
            {
                "image": "elasticio/email:5772ae1780f912e4f098de5718511b57b279766f",
                "id": "step_2",
                "function": "send",
                "env": {
                    "MANDRILL_API_KEY": "PLACE_YOUR_KEY_HERE"
                }
            },
            {
                "image": "elasticio/mapper:c9e011cf7866a2e82771b62cfd96cd75868f5b90",
                "id": "mapper:step_1:step_2",
                "function": "jsonataMap",
                "data": {
                    "mapper": {
                        "to": "\"anton@elastic.io\"",
                        "subject": "\"Test from e.io at: \" & $.fireTime",
                        "textBody": "\"Body is: \\n\" &\n$string($$)"
                    }
                }
            }
        ],
        "connections": [
            {
                "from": "step_1",
                "to": "mapper:step_1:step_2"
            },
            {
                "from": "mapper:step_1:step_2",
                "to": "step_2"
            }
        ]
    }
}
```
Flow definition consists of flow id and actually flow definition. Flow id, as always with kubernetes descriptors, is at path `.metadata.name`. Flow definition is at path `.spec` and contains two subsections: `nodes` and `connections`.
* `nodes` defines graph nodes -- running components. Most of fields in example are self-explanatory but details
    * `id` identifier of node inside graph. Used to define links between nodes and and as internal identifier in platform. 
    * `image` docker image to run
    * `function` Component may contain several funcions in it. This field selects function to run
    * `isPolling` Optional, defauls to false. If true, it tells platform, that component should be notified every minute with message. Otherwise component should have it's own lifecycle and decide when to send messages furhter.
    * `env` Key-value pairs that will be accessible as environment variables inside running component. Optional field.
    * `first` Boolean flag, that declares this node as "entrypoint". Usefull in case if node expects some input from outer world. Optional
    * `data` section contains different component specific configs. During startup component fetches it and uses according to it's business logic. This data is opaque for platform. It's passed as is to component. 
* `connections` Is array that defines edges between graph nodes. Any edge is defined as object that references edge begin and edge end node identifiers. `from` field contains id of node that send's messages into edge and `to` field contains id of node that receives messages from edge.


## build
To build platform just run next commands
```shell
docker build -t openintegrationhub/flows-operator:latest services/flows-operator
docker push openintegrationhub/flows-operator:latest

docker build -t openintegrationhub/scheduler:latest services/scheduler
docker push openintegrationhub/scheduler:latest

docker build -t openintegrationhub/communication-router:latest services/communication-router
docker push openintegrationhub/communication-router:latest
```

## TODOS/Known issues
* Platform does not handle changes in task. So to apply changes you need to delete and then recreate flow.
* Platform does not handle task failure. So if component fails, and kubernetes failed to start it within retries defined by standart restart policy, than component will be broken, and the whole flow will be broken
* Platform does not provide a way to configure secrets to download private docker images
* Platform does not provide a way to inject some input data into flow. But this may be done by first step itself (e. g. start http server and create kubernete's service to handle input traffic for it)
* Platform does not define resource limits on components. This confuses kubernetes' distribution mechanisms, and in worst case all components may be started at same node, and overload it.  
* Platform does not remove queues and exchanges used by task after task deletion 
* Platform use same rabbitmq account for itself and for tasks. And requires that account has privileges to create queues and exchanges in virtual host.
* Platform uses rabbitmq inside deployment, and does not persist rabbitmq's durable messages at some "real" storage. So they'll be lost after platform restart
* There may be race condition between external world and service. So fast delete/creation of flow may be ignored
* There may be race condition between scheduler and job start. First timer tick may be lost.

