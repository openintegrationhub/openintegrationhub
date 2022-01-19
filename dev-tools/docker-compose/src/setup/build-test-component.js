const { execSync } = require('child_process')
const path = require('path')
const { checkTools } = require('../helper')

checkTools(['minikube', 'docker'])

async function run() {
  execSync(
    `cd ${path.resolve(
      __dirname,
      '../../../',
      'test-component'
    )} && bash build.sh`,
    {
      stdio: 'inherit',
    }
  )
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
