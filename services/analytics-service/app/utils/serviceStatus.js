const config = require('../config');

async function reportServiceStatus(checkLive) {

  const serviceUrls = {
    flowRepository: config.flowRepoUrl,
    templateRepository: config.templateRepoUrl,
    componentRepository: config.componentRepoUrl,
    loggingService: config.loggingServiceUrl,
    governanceService: config.governanceServiceUrl,
    dataHub: config.dataHubUrl,
    iam: config.iamUrl
  };

  const services = {};

  for (key in serviceUrls) {
    if (service[key] === false) {
      services[key] = 'disabled'
    } else {
      if (checkLive){
      // TODO: Optionally check if services are reachable
    } else {
      services[key] = 'enabled'
      }
    }
  }

  return services;
}

module.exports = {
  reportServiceStatus
};
