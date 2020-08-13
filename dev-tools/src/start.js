const { execSync } = require("child_process")
const { devToolsRoot, env, dbRoot, services } = require("./config")
const {
  waitForIAM,
  waitForMongo,
  getAccountToken,
  checkTools,
} = require("./helper")

checkTools(["docker", "docker-compose", "minikube", "mongo", "minikube"])

async function run() {
  execSync(`cd ${dbRoot} && docker-compose up -d`)

  waitForMongo()

  // start iam
  execSync(`cd ${devToolsRoot} && docker-compose up -d iam`, {
    env,
    stdio: "inherit",
  })

  await waitForIAM()

  // gererate service account token (IAM_TOKEN)
  const serviceAccountToken = await getAccountToken(
    services.iam.serviceUserName,
    services.iam.servicePassword
  )

  execSync(`cd ${devToolsRoot} && docker-compose up -V`, {
    env: {
      ...env,
      DEV_IAM_TOKEN: serviceAccountToken,
    },
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
