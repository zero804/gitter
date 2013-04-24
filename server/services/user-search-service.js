/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require('./troupe-service');
var persistence = require("./persistence-service");

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).toLowerCase().replace(/[^a-z\d\s]/g, ' ');
  var parts = normalized.split(/\s+/).filter(function(s, index) { return index < 10; } );
  return parts.map(function(i) {
    return new RegExp("\\b" + i, "i");
  });
}

exports.searchForUsers = function(userId, queryText, options, callback) {
  var res = createRegExpsForQuery(queryText);
  if(!res.length) return callback(null, []);

  var limit = options.limit || 20;
  var skip = options.skip || 0;

  if(limit > 100) {
    limit = 100;
  }

  troupeService.findAllTroupesIdsForUser(userId, function(err, troupeIds) {
    if(err) return callback(err);
    if(!troupeIds.length) return callback(null, []);

    troupeService.findAllUserIdsForTroupes(troupeIds, function(err, userIds) {
      if(!userIds.length) return callback(err, []);
      var q = persistence.User.where('_id')['in'](userIds);

      res.forEach(function(r) {
        q.find({ displayName: r });
      });

      q.limit(limit)
        .skip(skip)
        .exec(function(err, results) {
          return callback(err, results);
        });

    });
  });
};

exports.testOnly = {
  createRegExpsForQuery: createRegExpsForQuery
};
