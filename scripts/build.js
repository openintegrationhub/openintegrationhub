const { execSync } = require('child_process');
//FIXME have no access to integration-content-repository. Temporary exclude it from build
const services = require(`${__dirname}/toBuild.json`).filter(({name}) => name !== 'integration-content-repository');
if (services && services.length > 0) {

    if (process.env.DOCKER_PASSWORD && process.env.DOCKER_USERNAME) {
        execSync('echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin', { stdio: [0, 1, 2] });
    } else {
        console.log('WARN: skip docker login due to missing DOCKER_PASSWORD and/or DOCKER_USERNAME environment variables');
    }

    services.forEach((service)=>{

        console.log('We going to Build Service: ',service.name);
        console.log('The Service Version: ',service.version);

        execSync(`cd ${__dirname}/../services/${service.name}/ && yarn build`, { stdio: [0, 1, 2] });
        execSync(`cd ${__dirname}/../services/${service.name}/ && yarn run build:docker`, { stdio: [0, 1, 2], env: Object.assign({VERSION: service.version}, process.env) });
        execSync(`docker tag openintegrationhub/${service.name}:${service.version} openintegrationhub/${service.name}:latest`, { stdio: [0, 1, 2] });

        //execSync(`docker push openintegrationhub/${service.name}:${service.version}`, { stdio: [0, 1, 2] });
        //execSync(`docker push openintegrationhub/${service.name}:latest`, { stdio: [0, 1, 2] });
    });
} else {
    console.log('No Changes to Services!')
}
