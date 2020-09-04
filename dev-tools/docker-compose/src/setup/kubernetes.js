const YAML = require('yaml')
const fs = require('fs')
const path = require('path')

const { kubernetesHost, clusterName } = require('../config')
const { readKubeConfig } = require('../helper')

const tempKubeFolder = path.resolve(__dirname, '.kube/')
const newConfigPath = path.resolve(tempKubeFolder, 'config')

const kubeConfig = readKubeConfig()
// strip minikube setup from users config

const cluster = kubeConfig.clusters.filter(
  (item) => item.name === clusterName
)[0]

const context = kubeConfig.contexts.filter(
  (item) => item.name === clusterName
)[0]

const user = kubeConfig.users.filter((item) => item.name === clusterName)[0]

if (!fs.existsSync(tempKubeFolder)) {
  fs.mkdirSync(tempKubeFolder)
}

// copy certificates

fs.copyFileSync(
  cluster.cluster['certificate-authority'],
  path.resolve(tempKubeFolder, 'ca.crt')
)

fs.copyFileSync(
  user.user['client-certificate'],
  path.resolve(tempKubeFolder, 'client.crt')
)

fs.copyFileSync(
  user.user['client-key'],
  path.resolve(tempKubeFolder, 'client.key')
)

cluster.cluster.server = kubernetesHost
cluster.cluster['insecure-skip-tls-verify'] = true
cluster.cluster['certificate-authority'] = 'ca.crt'

user.user['client-certificate'] = 'client.crt'
user.user['client-key'] = 'client.key'

// set new kubernetes host

kubeConfig.clusters = [cluster]
kubeConfig.contexts = [context]
kubeConfig.users = [user]

fs.writeFileSync(newConfigPath, YAML.stringify(kubeConfig))
