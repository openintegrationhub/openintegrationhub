const { execSync } = require('child_process')
const path = require('path')
const { minikubeArgs } = require('../config')
const { checkTools } = require('../helper')

checkTools(['minikube', 'kubectl'])

async function run() {
  execSync(`minikube start ${minikubeArgs}`, {
    stdio: 'inherit',
  })

  execSync(`kubectl -n flows delete pods,services,deployments --all`, {
    stdio: 'inherit',
  })

  execSync(`kubectl delete ns flows || true`, {
    stdio: 'inherit',
  })

  execSync(`kubectl apply -f ${path.resolve(__dirname, 'namespace.yml')}`, {
    stdio: 'inherit',
  })
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
