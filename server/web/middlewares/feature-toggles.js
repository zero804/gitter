'use strict';

var fflip = require('fflip');
var mongoUtils = require('../../utils/mongo-utils');

var Criteria = {
  percentageOfUsers: function(user, percent) {
    var timestamp = Math.round(mongoUtils.getTimestampFromObjectId(user._id) / 1000) || 0;

    return (timestamp % 100 < percent);
  },

  allowUsernames: function(user, usernameHash) {
    if (!usernameHash) return false;
    return usernameHash[user.username];
  }
};

// TODO: replace this with a dynamic lookup
var StaticFeatures = {
  halley: {
    criteria: {
      allowUsernames: { suprememoocow: 1 }
    }
  }
};

fflip.config({
  criteria: Criteria,
  features: StaticFeatures,
  reload: 60
});


module.exports = [
  fflip.express_middleware,
  function(req, res, next) {
    if (!req.user) return next();
    req.fflip.setForUser(req.user);
    next();
  }
];
