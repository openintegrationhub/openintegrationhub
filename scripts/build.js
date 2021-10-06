const { execSync } = require('child_process')
const services = require('./services')

services.forEach((service) => {
    console.log('_____')
    console.log(`Build ${service.name}@${service.version}`)

    try {
        // if version of service not exists -> fail
        execSync(`curl --silent 'https://registry.hub.docker.com/v2/repositories/openintegrationhub/${service.name}/tags' | grep -F \\"${service.version}\\"`)
        console.log('Docker image found, skip build')
    } catch(err) {
        // build new version
        console.log('Build new docker image')
        if (service.buildScript) execSync(`cd ${service.path} && npm run build`, { stdio: [0, 1, 2] })
        execSync('echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin', { stdio: [0, 1, 2] });
        execSync(`cd ${service.path} && npm run build:docker`, { stdio: [0, 1, 2], env: Object.assign({VERSION: service.version}, process.env) });
        execSync(`docker tag openintegrationhub/${service.name}:${service.version} openintegrationhub/${service.name}:latest`, { stdio: [0, 1, 2] });
        execSync(`docker push openintegrationhub/${service.name}:${service.version}`, { stdio: [0, 1, 2] });
        execSync(`docker push openintegrationhub/${service.name}:latest`, { stdio: [0, 1, 2] });
    }
});
