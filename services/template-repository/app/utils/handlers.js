const mongoose = require('mongoose');
const log = require('../config/logger');
const config = require('../config/index');

const storage = require(`../api/controllers/${config.storage}`); // eslint-disable-line

async function cleanupOrphans() {
  const { publishQueue } = require('./eventBus'); // eslint-disable-line

  const orphans = await storage.getOrphanedTemplates();
  const promises = [];
  let counter = 0;
  for (let i = 0; i < orphans.length; i += 1) {
    if (orphans[i].status === 'published') {
      counter += 1;
      const formattedOrphan = storage.format(orphans[i]);
      formattedOrphan.status = 'draft';

      const ev = {
        headers: {
          name: 'templaterepo.template.modified',
        },
        payload: formattedOrphan,
      };
      promises.push(publishQueue(ev));
    }
  }

  await Promise.all(promises);

  return counter;
}

async function gdprAnonymise(id) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return false;
  }

  if (!id) {
    log.warn('Received anonymise event without ID given');
    return true;
  }

  await storage.anonymise(id);

  await cleanupOrphans();

  return true;
}

module.exports = {
  gdprAnonymise, cleanupOrphans,
};
