'use strict';

// This file itself is not a shared module (only server) but
// See `webpack.config.js` to find the aliased version for the frontend
var troupeEnv = {};

try {
  // Coming from symlink `./shared`
  troupeEnv = require('../server/web/troupe-env');
}
catch(err) {
  // Coming from `./node_modules/shared`
  troupeEnv = require('../../server/web/troupe-env');
}

module.exports = troupeEnv;
