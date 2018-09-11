
const fs = require('fs');
const { execSync } = require('child_process');
const services = require(`${__dirname}/toBuild.json`);
if (services && services.length > 0) {


    services.forEach((service)=>{
        const version = require(`${__dirname}/../services/${service.name}/package.json`);
        console.log(service.name);
        // command for build needs to be defined
        execSync(`cd ${__dirname}/../services/${service.name}/ && echo $PWD`, { stdio: [0, 1, 2] });
        // execSync('echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin', { stdio: [0, 1, 2] });
        // execSync(`docker build -t $DOCKER_USERNAME/${service.name}:${version} .`, { stdio: [0, 1, 2] });
        // execSync(`docker tag $DOCKER_USERNAME/${service.name}:$VERSION $DOCKER_USERNAME/${service.name}:latest`, { stdio: [0, 1, 2] });

        // execSync(`docker push $DOCKER_USERNAME/${service.name}:$VERSION`, { stdio: [0, 1, 2] });
        // execSync(`docker push $DOCKER_USERNAME/${service.name}:latest`, { stdio: [0, 1, 2] });
    });
} else {
    console.log('No Changes to Services!')
}
