const fetch = require('node-fetch');
const qs = require('qs');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

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

async function getFlows(auth, status) {
  try {
    let number = 1;
    let flows = [];
    let hasMore = true;

    while (hasMore === true) {
      hasMore = false;

      const query = {
        page: {
          size: 100,
          number,
        },
      };

      if (status === 'active' || status === 'inactive') {
        query.filter = { status };
      }

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

      const body = await response.json();

      if (!response || !response.ok) {
        log.error('Could not fetch flows!');
        log.error('Status', response.status);
        log.error(body);
        hasMore = false;
      }

      if (body.data && body.data.length) {
        flows = flows.concat(body.data);
      }

      if (body.meta && body.meta.total > flows.length && body.data && body.data.length > 0) {
        number += 1;
        hasMore = true;
      } else {
        hasMore = false;
      }
    }
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

async function getAllTemplates(auth) {
  const size = 100;
  let number = 0;
  let hasMore = true;
  const status = '1';
  let templates = [];
  while (hasMore === true) {
    const body = await getTemplates(auth, size, number, status);
    if (body.meta && body.meta.total > templates.length) {
      templates = templates.concat(body.data);
      number += 1;
    } else {
      hasMore = false;
    }
  }

  return templates;
}

async function getUsers(auth) {
  try {
    const url = `${config.iamUrl}/api/v1/users`;

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

    if (!response || !response.ok) {
      log.error('Could not fetch users!');
      log.error('Status', response.status);
      log.error(users);
    }

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

    const url = `${config.componentRepoUrl}/components${string}`;

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

    if (!response || !response.ok) {
      log.error('Could not fetch components!');
      log.error('Status', response.status);
      log.error(components);
    }

    return components;
  } catch (e) {
    log.error(e);
    return [];
  }
}

async function getAllComponents(auth) {
  const size = 100;
  let number = 1;
  let hasMore = true;
  let components = [];
  while (hasMore === true) {
    hasMore = false;
    const body = await getComponents(auth, size, number);
    if (body.total > components.length) {
      components = components.concat(body.data);
      number += 1;
      hasMore = true;
    } else {
      hasMore = false;
    }
  }

  return components;
}

// timestamp in miliseconds
// bucketSize in minutes
function decideBucket(timestamp, bucketSize) {
  const windowSize = bucketSize * 60 * 1000;
  const x = timestamp / windowSize;
  let cleanTimestamp = Math.ceil(x) * windowSize - windowSize;
  // Fix for start of js timestamp (GMT: Thursday, January 1, 1970 12:00:00 AM)
  if (bucketSize >= 1440) {
    cleanTimestamp = dayjs(cleanTimestamp).utc().startOf('day').valueOf();
  }
  return cleanTimestamp;
}

module.exports = {
  reportServiceStatus,
  getFlows,
  getTemplates,
  getUsers,
  getComponents,
  getAllTemplates,
  getAllComponents,
  decideBucket,
};
