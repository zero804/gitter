"use strict";

var loadTroupeFromParam = require('./load-troupe-param');
var createSecurityResource = require('../common/create-security-resource');

module.exports = createSecurityResource({
  id: 'roomSecurity',
  getSecurityDescriptor: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return troupe.sd;
      });
  },
  subresourcesRoot: {
    'extraAdmins': require('./security-extra-admins')
  }
})
