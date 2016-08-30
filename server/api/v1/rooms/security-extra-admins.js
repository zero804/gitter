"use strict";

var loadTroupeFromParam = require('./load-troupe-param');
var createSecurityExtraAdminsResource = require('../common/create-security-extra-admins-resource');

module.exports = createSecurityExtraAdminsResource({
  id: 'roomSecurityExtraAdmin',
  getSecurityDescriptor: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return troupe.sd;
      })
  }
})
