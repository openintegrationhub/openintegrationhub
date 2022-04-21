const fetch = require('node-fetch');
const qs = require('qs');
const config = require('../config');
const log = require('../config/logger');

async function reportServiceStatus(checkLive) {
  const serviceUrls = {
    flowRepository: config.flowRepoUrl,
    templateRepository: config.templateRepoUrl,
    componentRepository: config.componentRepoUrl,
    loggingService: config.loggingServiceUrl,
    governanceService: config.governanceServiceUrl,
    dataHub: config.dataHubUrl,
    iam: config.iamUrl,
  };

  const services = {};

  for (const key in serviceUrls) {
    if (services[key] === false) {
      services[key] = 'disabled';
    } else if (checkLive) {
      // TODO: Optionally check if services are reachable
    } else {
      services[key] = 'enabled';
    }
  }

  return services;
}

async function getFlows(auth, size, number, status) {
  try {
    const query = {
      page: {
        size,
        number,
      },
      filter: {
        status,
      },
    };

    const string = qs.stringify(query, { addQueryPrefix: true });

    const url = `${config.flowRepoUrl}/flows${string}`;

    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          authorization: auth,
        },
      },
    );

    const flows = response.json();

    return flows;
  } catch (e) {
    log.error(e);
    return [];
  }
}

async function getTemplates(auth, size, number, status) {
  try {
    const query = {
      page: {
        size,
        number,
      },
      filter: {
        status,
      },
    };

    const string = qs.stringify(query, { addQueryPrefix: true });

    const url = `${config.templateRepoUrl}/templates${string}`;

    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          authorization: auth,
        },
      },
    );

    const templates = response.json();

    return templates;
  } catch (e) {
    log.error(e);
    return [];
  }
}

async function getUsers(auth) {
  try {
    const query = {
      meta: true,
    };

    const string = qs.stringify(query, { addQueryPrefix: true });

    const url = `${config.iamUrl}/api/v1/users${string}`;

    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          authorization: auth,
        },
      },
    );

    const users = response.json();

    return users;
  } catch (e) {
    log.error(e);
    return [];
  }
}

async function getComponents(auth, size, number) {
  try {
    const query = {
      page: {
        size,
        number,
      },
    };

    const string = qs.stringify(query, { addQueryPrefix: true });

    const url = `${config.iamUrl}/components${string}`;

    const response = await fetch(
      url,
      {
        method: 'GET',
        headers: {
          authorization: auth,
        },
      },
    );

    const components = response.json();

    return components;
  } catch (e) {
    log.error(e);
    return [];
  }
}

module.exports = {
  reportServiceStatus, getFlows, getTemplates, getUsers, getComponents,
};
