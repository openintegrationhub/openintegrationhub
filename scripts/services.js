const fs = require('fs')
const path = require('path')

const basePath = path.resolve(__dirname, "../services")
const paths = fs.readdirSync(basePath)
const services = []
const ignoreServices = []

for (const service of paths) {
  if (ignoreServices.includes(service)) continue
  const servicePath = path.join(basePath, service)
  const temp = JSON.parse(fs.readFileSync(`${servicePath}/package.json`))
  services.push({
    name: service,
    version: temp.version,
    path: servicePath,
    buildScript: temp.scripts.build
  })
}

module.exports = services