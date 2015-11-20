'use strict';

var fflip = require('fflip');
var mongoUtils = require('../../utils/mongo-utils');
var persistence = require('../../services/persistence-service');

/**
 * List of criteria functions to be used by feature toggles
 */
var Criteria = {
  /* Allow a certain percentage of users */
  percentageOfUsers: function(user, percent) {
    if (!user) return false;
    var timestamp = Math.round(mongoUtils.getTimestampFromObjectId(user._id) / 1000) || 0;
    return (timestamp % 100 < percent);
  },

  /* Allow a hash of usernames */
  allowUsernames: function(user, usernameHash) {
    if (!user) return false;
    if (!usernameHash) return false;
    return !!usernameHash[user.username];
  },

  /* Enabled criteria */
  enabled: function(/*user*/) {
    return true;
  }
};

function getFeatures(callback) {
  persistence.FeatureToggle.find({})
    .lean()
    .exec()
    .then(function(togglesList) {
      var featureToggles = togglesList.reduce(function(memo, toggle) {
        memo[toggle.name] = { criteria: toggle.criteria };
        return memo;
      }, {});

      // NOTE: this callback doesn't have an err.
      callback(featureToggles);
    });
}

fflip.config({
  criteria: Criteria,
  features: getFeatures,
  reload: 60 // Reload features every 60 seconds
});


module.exports = [
  fflip.express_middleware,
  function(req, res, next) {
    if (!req.user) return next();
    req.fflip.setForUser(req.user);
    next();
  }
];
