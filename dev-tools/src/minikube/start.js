const { execSync } = require("child_process")

const { checkTools } = require("../helper")

checkTools(["minikube"])

async function run() {
  execSync(`minikube start`, {
    stdio: "inherit",
  })
  execSync(`minikube addons enable ingress`, {
    stdio: "inherit",
  })
  execSync(`minikube addons enable dashboard`, {
    stdio: "inherit",
  })
  execSync(`minikube addons enable metrics-server`, {
    stdio: "inherit",
  })
}

; (async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
