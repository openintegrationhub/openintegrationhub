const { execSync } = require('child_process');
const services = require(`${__dirname}/toBuild.json`);

if (services && services.length > 0) {
    execSync (`${__dirname}/install-gcloud.sh`, { stdio: [0, 1, 2] });
    services.forEach((service)=>{

        console.log('We going to Deploy Service: ',service.name);
        console.log('In the Version: ',service.version);
        console.log(`Command:  kubectl set image deployment/${service.name} ${service.name}=openintegrationhub/${service.name}:${service.version}`)
        execSync (`/home/circleci/google-cloud-sdk/bin/kubectl -n oih-prod-ns set image deployment/${service.name} ${service.name}=openintegrationhub/${service.name}:${service.version}`, { stdio: [0, 1, 2] });
    });
} else {
    console.log('No Changes to Services!')
}
