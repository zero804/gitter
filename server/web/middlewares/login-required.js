/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env = require('../../utils/env');
var logger = env.logger;

module.exports = function(req, res) {

  // Are we dealing with an API client? Tell em in HTTP
  // Windows Phone sends accept: */* for oauth logins. Reported by @RReverser
  if(!req.nonApiRoute && req.accepts(['json','html']) === 'json') {
    /* API client without access, shouldn't really happen :( */
    logger.warn("User is not logged in, denying access");

    res.send(401, { success: false, loginRequired: true });
    return;
  }

  if (req.session) {
    req.session.returnTo = req.url;
  }

  logger.verbose("User is not logged in, redirecting to login page");
  return res.relativeRedirect("/login");
};

