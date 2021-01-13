const { execSync } = require('child_process');
const services = require('./services')

execSync(`${__dirname}/install-gcloud.sh`, { stdio: [0, 1, 2] });

services.forEach((service) => {
    console.log('_____')
    console.log(`Deploy ${service.name}@${service.version}`)
    execSync(`/home/circleci/google-cloud-sdk/bin/kubectl -n oih-dev-ns set image deployment/${service.name} ${service.name}=openintegrationhub/${service.name}:${service.version}`, { stdio: [0, 1, 2] });
});
