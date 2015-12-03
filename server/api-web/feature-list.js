"use strict";

var persistence = require('../services/persistence-service');

function listFeatures() {
  return persistence.FeatureToggle.find({}, { name: 1 })
    .lean()
    .exec()
    .then(function(togglesList) {
      return togglesList.map(function(f) {
        return f.name;
      });
    });
}

module.exports = function(req, res, next) {
  listFeatures()
    .then(function(featureNames) {
      var result = featureNames.map(function(name) {
        return { name: name, enabled: req.fflip.has(name) };
      });

      res.send(result);
    })
    .catch(next);
};
