const { can, hasOneOf } = require('@openintegrationhub/iam-utils');
const tokens = require('./tokens');

const userWithComponents = {
  sub: '61f13960e88b288fd905c8ab',
  tenant: '61f13992a4a0ad3c113c7c65',
  permissions: [],
};

const iam = {
  middleware(req, _, next) {
    const tokenName = req.headers.authorization;
    if (!tokens[tokenName]) {
      throw new Error('User not valid');
    }
    req.user = tokens[tokenName].value;
    return next();
  },
  can,
  hasOneOf,
};

module.exports = {
  iam,
  userWithComponents,
};
