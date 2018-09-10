
const fs = require('fs');
const { execSync } = require('child_process');
const services = require(`${__dirname}/toBuild.json`);
if (services && services.length > 0) {


    services.forEach((service)=>{
        console.log(service.name);
        // command for build needs to be defined
        execSync(`cd ${__dirname}/../services/${service.name}/ && echo $PWD`, { stdio: [0, 1, 2] });
      });
} else {
    console.log('No Changes to Services!')
}

// echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
// docker build -t $DOCKER_USERNAME/${SERVICE_NAME}:$VERSION .
// docker images
// docker tag $DOCKER_USERNAME/${SERVICE_NAME}:$VERSION $DOCKER_USERNAME/${SERVICE_NAME}:latest
// docker push $DOCKER_USERNAME/${SERVICE_NAME}:$VERSION
// docker push $DOCKER_USERNAME/${SERVICE_NAME}:latest