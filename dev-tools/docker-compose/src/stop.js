const { execSync } = require('child_process')
const path = require('path')
const { devToolsRoot, env } = require('./config')
const { checkTools } = require('./helper')

checkTools(['docker-compose', 'minikube'])

execSync(`cd ${devToolsRoot} && docker-compose down`, {
  env: {
    ...process.env,
    ...env,
  },
  stdio: 'inherit',
})

execSync(`cd ${path.resolve(__dirname, '../db')} && docker-compose down`, {
  stdio: 'inherit',
})

execSync(`minikube stop`, {
  stdio: 'inherit',
})
