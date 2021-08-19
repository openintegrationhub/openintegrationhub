const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { checkTools } = require('../helper')

function getAvailablePackages(type = 'services') {
  const basePath = path.resolve(__dirname, `../../../../${type}`)
  const paths = fs.readdirSync(basePath)
  const results = []

  for (const pkg of paths) {
    const pkgPath = path.join(basePath, pkg)
    const temp = JSON.parse(fs.readFileSync(`${pkgPath}/package.json`))
    results.push({
      name: pkg,
      version: temp.version,
      dependencies: temp.dependencies,
      devDependencies: temp.devDependencies,
      path: pkgPath,
    })
  }
  return results
}

function getDependentPackages(available = {}, changedLib = '', type = '') {
  const dependent = []
  available[type].forEach((availablePkg) => {
    const match = new RegExp(changedLib, 'i')

    for (const dep of Object.keys(availablePkg.devDependencies).concat(
      Object.keys(availablePkg.dependencies)
    )) {
      if (match.test(dep)) {
        dependent.push(availablePkg.name)
        return
      }
    }
  })
  return dependent
}

function bumpMinor(
  available = {},
  pkg = '',
  shouldPerformBump = false,
  bumpType = 'minor'
) {
  const found = available.find((p) => p.name === pkg)
  if (found) {
    const [major, minor, patch] = found.version
      .split('.')
      .map((v) => parseInt(v, 10))

    let newVersion = ''
    if (bumpType === 'minor') {
      newVersion = `${major}.${minor + 1}.${0}`
    } else {
      newVersion = `${major}.${minor}.${patch + 1}`
    }

    console.log(
      `${found.path.match(/(service|lib).+/)[0]}: ${
        found.version
      } -> ${newVersion}`
    )
    if (shouldPerformBump) {
      const temp = JSON.parse(fs.readFileSync(`${found.path}/package.json`))
      temp.version = newVersion

      fs.writeFileSync(
        `${found.path}/package.json`,
        JSON.stringify(temp, null, 2),
        'utf8'
      )
    }
  }
}

checkTools(['git'])

async function run() {
  const diffTarget = process.argv[2]
  const shouldPerformBump = !!(process.argv[3] && process.argv[3] === 'bump')
  const bumpType = process.argv[4] || 'minor'

  const available = {
    services: getAvailablePackages('services'),
    lib: getAvailablePackages('lib'),
  }

  const ignored = {
    services: ['logic-gateway'],
    lib: ['secret-service'],
  }

  const changed = {
    services: [],
    lib: [],
  }

  const dependent = {
    services: [],
    lib: [],
  }

  const total = {
    services: [],
    lib: [],
  }

  if (!diffTarget)
    throw new Error('Please provide a target for diff (tag, commit, etc.)')

  const result = execSync(
    `git diff ${diffTarget} --name-only | grep -E -i -w '^services|^lib' || true`
  ).toString()

  // create list of services / lib
  const changes = result.split(/\n/g)

  changes.forEach((fileName) => {
    const pathSegments = fileName.split('/')
    if (pathSegments[0] !== 'services' && pathSegments[0] !== 'lib') return
    if (changed[pathSegments[0]].includes(pathSegments[1])) return
    // if (ignored[pathSegments[0]].includes(pathSegments[1])) return
    changed[pathSegments[0]].push(pathSegments[1])
  })

  // detect services that are dependent on changed libs
  changed.lib.forEach((changedLib) => {
    dependent.services = dependent.services.concat(
      getDependentPackages(available, changedLib, 'services')
    )
  })

  total.lib = [...new Set(changed.lib)].filter(
    (lib) => !ignored.lib.includes(lib)
  )

  total.services = [
    ...new Set(changed.services.concat(dependent.services)),
  ].filter((service) => !ignored.services.includes(service))

  console.log('lib', total.lib.length, total.lib)
  console.log('services', total.services.length, total.services)

  total.lib.forEach((lib) =>
    bumpMinor(available.lib, lib, shouldPerformBump, bumpType)
  )
  total.services.forEach((service) =>
    bumpMinor(available.services, service, shouldPerformBump, bumpType)
  )
}

;(async () => {
  try {
    await run()
  } catch (err) {
    console.log(err)
  }
})()
