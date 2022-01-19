const { execSync } = require('child_process')
const fetch = require('node-fetch')
const fs = require('fs')
const YAML = require('yaml')

const serviceAccounts = require('./data/service-accounts')

const {
  services,
  kubeConfigPath,
  clusterName,
  env,
  dbRoot,
  nodeImage,
  repositoryRoot,
  devToolsRoot,
} = require('./config')

const iamBase = `http://localhost:${services.iam.externalPort}`

module.exports = {
  async login({ customIamBase, username, password }) {
    const base = customIamBase || iamBase

    const response = await fetch(`${base}/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    if (response.status !== 200) {
      throw new Error(response.statusText)
    }

    return response.json()
  },
  async createPersistentToken({
    customIamBase,
    token,
    accountId,
    description,
    customPermissions,
  }) {
    const base = customIamBase || iamBase
    console.log(`${base}/api/v1/tokens`)
    const response = await fetch(`${base}/api/v1/tokens`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountId,
        expiresIn: -1,
        description: description || 'service-token',
        customPermissions,
      }),
    })

    if (response.status !== 200) {
      throw new Error(response.statusText)
    }

    return response.json()
  },
  async getUserInfo(token, customIamBase = null) {
    const base = customIamBase || iamBase
    const response = await fetch(`${base}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.status !== 200) {
      throw new Error(response.statusText)
    }

    return response.json()
  },
  async setupMinimal(services_) {
    execSync(`cd ${dbRoot} && docker-compose up -d`, {
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'inherit',
    })

    module.exports.waitForMongo()

    // start iam
    execSync(`cd ${devToolsRoot} && docker-compose up -d iam`, {
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'inherit',
    })

    await module.exports.waitForStatus({ url: iamBase, status: 200 })

    const { username, password } = serviceAccounts.find(
      (account) => account.firstname === 'default'
    )

    const { token } = await module.exports.login({ username, password })

    for (const service of services_) {
      // start service
      execSync(`mongo ${service.db} --eval "db.dropDatabase()"`, {
        stdio: 'inherit',
      })

      execSync(`cd ${devToolsRoot} && docker-compose up -d ${service.folder}`, {
        env: {
          ...process.env,
          ...env,
          DEV_IAM_TOKEN: token,
        },
        stdio: 'inherit',
      })
    }
  },
  readKubeConfig() {
    const file = fs.readFileSync(kubeConfigPath, 'utf8')

    if (!file) {
      throw new Error(`Kubernetes config not found in ${kubeConfigPath}`)
    }

    return YAML.parse(file)
  },

  getMinikubeClusterIp() {
    const config = module.exports.readKubeConfig()
    const minikubeConfig = config.clusters.filter(
      (item) => item.name === clusterName
    )[0]

    return minikubeConfig.cluster.server.replace('https://', '')
  },

  getMinikubeInternalIp() {
    return module.exports.getMinikubeClusterIp().replace(/[0-9]+:[0-9]+$/, '1')
  },

  checkTools(tools = []) {
    for (const tool of tools) {
      try {
        execSync(`type ${tool}`)
      } catch (err) {
        console.error(`${tool} not available. Please install first`)
      }
    }
  },
  waitForMongo() {
    console.log('Waiting for MongoDB')
    while (true) {
      try {
        execSync('mongo --eval "db.getCollectionNames()"')
      } catch (err) {
        continue
      }
      break
    }
  },
  waitForRabbitMQ() {
    console.log('Waiting for RabbitMQ')
    while (true) {
      try {
        execSync(`docker exec -ti rabbitmq sh -c "rabbitmqctl status"`, {
          stdio: 'inherit',
        })
      } catch (err) {
        continue
      }
      break
    }
  },
  async waitForStatus({ url, status }) {
    console.log(`Waiting for ${status} on ${url}`)
    while (true) {
      try {
        const response = await fetch(url)
        if (response.status !== status) continue
      } catch (err) {
        continue
      }
      break
    }
  },

  runNpm(relPath, args) {
    execSync(
      `docker run --rm --name npmRunner -it -e npm_config_cache=/usr/src/app/.npm_cache -v ${repositoryRoot}:/usr/src/app ${nodeImage} sh -ci 'cd /usr/src/app/${relPath}; npm run ${args}'`,
      { stdio: 'inherit' }
    )
  }
}
