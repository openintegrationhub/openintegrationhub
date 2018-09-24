const { execSync } = require('child_process');
const services = require(`${__dirname}/toBuild.json`);
if (services && services.length > 0) {

    services.forEach((service)=>{

        console.log('We going to Build Service: ',service.name);
        console.log('The Service Version: ',service.version);

        execSync(`cd ${__dirname}/../services/${service.name}/ && yarn build`, { stdio: [0, 1, 2] });
        execSync('echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin', { stdio: [0, 1, 2] });
        execSync(`cd ${__dirname}/../services/${service.name}/ && yarn run build:docker`, { stdio: [0, 1, 2], env: Object.assign({VERSION: service.version}, process.env) });
        execSync(`docker tag openintegrationhub/${service.name}:${service.version} openintegrationhub/${service.name}:latest`, { stdio: [0, 1, 2] });

        execSync(`docker push openintegrationhub/${service.name}:${service.version}`, { stdio: [0, 1, 2] });
        execSync(`docker push openintegrationhub/${service.name}:latest`, { stdio: [0, 1, 2] });
    });
} else {
    console.log('No Changes to Services!')
}
