![linux](https://img.shields.io/badge/Linux-red.svg) ![Windows](https://img.shields.io/badge/Windows-blue.svg) 

<p align="center">
  <img src="https://github.com/openintegrationhub/openintegrationhub/blob/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="Sublime's custom image" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

In addion to setting up the Open Integration Hub on a cloud infrastucture such as GCP it is also possible to setup a local version of the framework. Make sure to perform the following to set up a local version of the OIH within your own minikube:

---

**Requirements:**

Make sure that minikube is endowed with sufficient resources. We suggest at least:

- _8GB of memory_
- _4 CPUs_

See _step 1_ for minikube command to allocate resources.

 _Windows:_ If you're using Windows we suggest to use virtual box. In order to use it, Hyper-V must be disabled [Enable/Disable Hyper-V on Windows 10](https://docs.microsoft.com/de-de/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v).

**Please make sure to clone the monorepo before you start.**

---

1. Make certain minikube is installed, configured, and started. The command for allocating sufficient resources is: `minikube start --memory 8096 --cpus 4`. If you already have an installed minikube instance that is using the virtualbox driver you can do `minikube stop` and then `VBoxManage modifyvm "minikube" --memory 8096 --cpus 4` to adjust the resource limits before starting again.

In particular, make certain that its ingress module is enabled (`minikube addons enable ingress`).  Make certain `kubectl` is configured to use minikube. To see if its correctly configured use the `kubectl config current-context` command.
For further information about how to set up minikube, see here:

- [Install Minikube](https://kubernetes.io/docs/tasks/tools/install-minikube/)
- [Installing Kubernetes with Minikube](https://kubernetes.io/docs/setup/learning-environment/minikube/)

2. _(You only have to perform this step if you're using a  **Windows** distribution and have the Docker client for Windows installed)._ Docker overwrites the acutal kubectl version. In order to fix this download the `kubectl.exe` from  [Install kubectl on Windows](https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-windows). Navigate to the docker directory (e.g. Program Files\Docker\Docker\resources\bin) andreplace the kubectl.exe in this folder with the one you just downloaded.
   
3. Set up the basic OIH infrastructure. To do this, simply execute `kubectl apply -f ./1-Platform`. This may take a while to finish. You can use `minikube dashboard` to check the status of the various deployments. Once they are all ready, you can proceed.

4. Set up host rules. To actually reach the services, you need to add an entry in your hosts file for each service. You can retrieve the IP with `minikube ip`, and need to make an entry for each host listed in the `ingress.yaml` file (e.g. `iam.localoih.com`).
If you are using...
  - a **Linux** distribution, you can automate this by using this terminal command:

    ```console
    `echo "$(minikube ip) iam.localoih.com smk.localoih.com flow-repository.localoih.com auditlog.localoih.com metadata.localoih.com      component-repository.localoih.com webhooks.localoih.com attachment-storage-service.localoih.com data-hub.localoih.com ils.localoih.com     web-ui.localoih.com" | sudo tee -a /etc/hosts`
    ```

  - a **Windows** distribution, you can find the host files under:

  ```
  windows\system32\etc\hosts
  ```

5. Deploy the OIH Identity and Access Management. To do so, simply execute `kubectl apply -f ./2-IAM`. Again, wait until the service is fully deployed and ready.

6. Create a service account and token for the other services in the OIH IAM. Using Postman (or another similar tool of choice), send these POST requests to `iam.localoih.com` with the header `Content-Type: application/json`:
- Login as admin:
  - Path: `/login`,
  - Body:
    ```json
    {
      "username": "admin@openintegrationhub.com",
      "password": "somestring"
    }
    ```
  - Use the returned token as a Bearer token for the remaining requests.
- Create a service account:
  - Path: `/api/v1/users`,
  - Body:
    ```json
    {
      "username":"test@test.de",
      "firstname":"a",
      "lastname":"b",
      "role":"SERVICE_ACCOUNT",
      "status":"ACTIVE",
      "password":"asd",
      "permissions":[
        "iam.tokens.introspect",
        "iam.token.introspect",
        "components.get"
      ]
    }
    ```
  - Use the returned id in the following request to create the token.
- Create persistent service token:
  - Path: `/api/v1/tokens`,
  - Body:
    ```json
    {
      "accountId": "{PASTE SERVICE ACCOUNT ID HERE}",
      "expiresIn": -1,
      "initiator": "{PASTE SERVICE ACCOUNT ID HERE}",
      "inquirer": "{PASTE SERVICE ACCOUNT ID HERE}"
    }
      ```
  - The returned token is the service token that will be used by the other services to authenticate themselves to the IAM. Copy the value, encode it in *base64*, and then past it into the file found at `./3-Secret/SharedSecret.yaml` at the indicated position (`REPLACE ME`).

7. Apply the shared secret via `kubectl apply -f ./3-Secret`. Ordinarily, each service would have its own secret for security reasons, but this is simplified for ease of use in a local context

8. Deploy the remaining services via `kubectl apply -Rf ./4-Services`. This may take a while.

9. The OIH is now running and ought to function just as it would in an online context. You can reach the various services via these URLS:
- Identity and Access Management. Create and modify users, tenants, roles, and permissions.
  - `iam.localoih.com`
- Secret Service. Securely store authentication data for other applications.
  - `skm.localoih.com`
- Flow Repository. Create, modify, and start/stop integration flows.
  - `flow-repository.localoih.com`
- Audit Log. View event logs spawned by the other services.
  - `auditlog.localoih.com`
- Metadata Repository. Create and modify master data models used by your connectors.
  - `metadata.localoih.com`
- Component Repository. Store and modify connector components.
  - `component-repository.localoih.com`
- Attachment Storage. Temporarily store larger files for easier handling in flows.
  - `attachment-storage-service.localoih.com`
- Data Hub. Long-term storage for flow content.
  - `data-hub.localoih.com`
- Integration Layer Service. Perform data operations such as merging or splitting objects.
  - `ils.localoih.com`
- Web UI. A basic browser-based UI to control certain other services.
  - `web-ui.localoih.com`

Most of these services have a Swagger documentation of their API available through the path `/api-docs`. Additionally, you can check their readmes in the `services` folder of the OIH Repository: [Open Integration Hub Services](https://github.com/openintegrationhub/openintegrationhub/tree/master/services)
