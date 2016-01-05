'use strict';

var fflip       = require('fflip');
var mongoUtils  = require('../../utils/mongo-utils');
var persistence = require('../../services/persistence-service');
var useragent   = require('useragent');

/**
 * List of criteria functions to be used by feature toggles
 */
var Criteria = {
  /* Allow a certain percentage of users */
  percentageOfUsers: function(userDetails, percent) {
    var user = userDetails.user;
    if (!user) return false;
    var timestamp = Math.round(mongoUtils.getTimestampFromObjectId(user._id) / 1000) || 0;
    return (timestamp % 100 < percent) || undefined;
  },

  /* Allow a hash of usernames */
  allowUsernames: function(userDetails, usernameHash) {
    var user = userDetails.user;
    if (!user) return false;
    if (!usernameHash) return false;
    return !!usernameHash[user.username] || undefined;
  },

  disableBrowser: function(userDetails, browsers) {
    if (!browsers) return true;

    var agent = useragent.parse(userDetails.userAgent);

    var allowedVersion = browsers[agent.family];
    if (!allowedVersion) return true;

    if (allowedVersion === 'all') return false;
    return agent.major > allowedVersion;
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

      if (!togglesList || togglesList.length === 0) {
        return callback({});
      }

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
    // Only logged in users get features
    if (!req.user) return next();

    req.fflip.setForUser({ user: req.user, userAgent: req.headers['user-agent'] });
    next();
  }
];
