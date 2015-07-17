/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restful = require('../../services/restful');

module.exports = {
  id: 'org',
  index: function(req, res, next) {
    if (!req.user) return res.send(403);

    return restful.serializeOrgsForUser(req.user, { /* mapUsers: !!req.query.include_users */ })
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  }
};
