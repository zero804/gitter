/* jshint node:true */
'use strict';

var speedy      = require ("speedy");
var mongoose    = require('gitter-web-mongoose-bluebird');
var mongoUtils    = require('gitter-web-persistence-utils/lib/mongo-utils');
var _ = require('underscore');
var ObjectID = require('mongodb').ObjectID;
// ObjectID.cacheHexString = true;
// mongoose.mongo.ObjectID.cacheHexString = true;

var sets = {
  tinyUniqueObjectIds: _.range(1).map(function() {
    var id = mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000));
    return id;
  }),

  smallUniqueObjectIds: _.range(1000).map(function() {
    var id = mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000));
    return id;
  }),
  //
  // mediumUniqueObjectIds:  _.range(2000).map(function() {
  //   var id = mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000));
  //   return id;
  // }),
  //
  // largeUniqueObjectIds: _.range(10000).map(function() {
  //   return mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000));
  // }),

  smallUniqueStrings: _.range(1000).map(function() {
    return mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000)).toString();
  }),
  //
  // mediumUniqueStrings:  _.range(2000).map(function() {
  //     return mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000)).toString();
  // }),

  largeUniqueStrings: _.range(10000).map(function() {
    return mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000)).toString();
  }),
  //
  // huge:_.range(100000).map(function() {
  //   return mongoUtils.createIdForTimestamp(Math.floor(Math.random() * 1000000000));
  // }),

};

speedy.samples (2);

var benchmarkSuite = Object.keys(sets).reduce(function(memo, key) {

  memo[key + 'WithUniq'] = function() {
    var len = _.uniq(sets[key]);
  };
  //
  // memo[key + 'Interlude1'] = function(done) {
  //   setTimeout(done, 500);
  // };

  memo[key + 'WithUniqueIds'] = function() {
      mongoUtils.uniqueIds(sets[key]);
  };

  // memo[key + 'Interlude2'] = function(done) {
  //   setTimeout(done, 500);
  // };

  return memo;

}, {});
speedy
  .on("progress", function(data) {
    global.gc();
  })
  .run (benchmarkSuite);
