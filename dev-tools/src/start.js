const { execSync, spawn } = require("child_process")
const { devToolsRoot, env, dbRoot, services } = require("./config")
const {
  waitForIAM,
  waitForMongo,
  getAccountToken,
  checkTools,
  getMinikubeClusterIp,
} = require("./helper")

checkTools([
  "docker",
  "docker-compose",
  "minikube",
  "mongo",
  "minikube",
  "simpleproxy",
])

let proxy = null

process.stdin.resume() // so the program will not close instantly

function exitHandler() {
  if (proxy) {
    console.log("kill proxy")
    proxy.kill("SIGTERM")
  }
  process.exit()
}

// do something when app is closing
process.on("exit", exitHandler.bind(null))

// catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null))

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null))
process.on("SIGUSR2", exitHandler.bind(null))

// catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null))

async function run() {
  console.log(env)
  execSync(`cd ${dbRoot} && docker-compose up -d`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  })

  waitForMongo()

  // start iam
  execSync(`cd ${devToolsRoot} && docker-compose up -d iam`, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  })

  await waitForIAM()

  // gererate service account token (IAM_TOKEN)
  const serviceAccountToken = await getAccountToken(
    services.iam.serviceUserName,
    services.iam.servicePassword
  )

  console.log(getMinikubeClusterIp())
  // start proxy to kubernetes cluster

  proxy = spawn("simpleproxy", [
    "-L",
    "9090",
    "-R",
    getMinikubeClusterIp().replace("https://", ""),
  ])

  execSync(`cd ${devToolsRoot} && docker-compose up -V`, {
    env: {
      ...process.env,
      ...env,
      DEV_IAM_TOKEN: serviceAccountToken,
    },
    stdio: "inherit",
  })
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
