const cp = require('child_process')
const path = require('path')
const { devToolsRoot, env } = require('./config')
const { checkTools } = require('./helper')

checkTools(['docker-compose', 'minikube'])

cp.execSync(`cd ${devToolsRoot} && docker-compose down`, {
  env: {
    ...process.env,
    ...env,
  },
  stdio: 'inherit',
})

cp.execSync(`cd ${path.resolve(__dirname, '../db')} && docker-compose down`, {
  stdio: 'inherit',
})

cp.execSync(`minikube stop`, {
  stdio: 'inherit',
})
