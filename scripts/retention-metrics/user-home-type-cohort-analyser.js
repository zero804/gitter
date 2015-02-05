/* jshint node:true, unused:true */
'use strict';

var _ = require('lodash');
var util = require("util");
var BaseRetentionAnalyser = require('./base-cohort-analyser');

function UserHomeTypeAnalyser() {
  BaseRetentionAnalyser.apply(this, arguments);
}
util.inherits(UserHomeTypeAnalyser, BaseRetentionAnalyser);

UserHomeTypeAnalyser.prototype.bucketFor = function(category) {
  if(category === 0) return "0";
  if(category < 10) return "0" + category;
  return "10 or more";
};

UserHomeTypeAnalyser.prototype.categoriseUsers = function(allCohortUsers, callback) {
  var result = _(allCohortUsers)
    .transform(function(result, userIds) {
      userIds.forEach(function(userId) {
        var pretty = (parseInt(userId.slice(-1), 16) % 2) === 0;
        result[userId] = pretty ? 'pretty' : 'personality';
      });
    }, {})
    .value();

  return callback(null, result);
};

module.exports = UserHomeTypeAnalyser;
