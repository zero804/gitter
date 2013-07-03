/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";
var Q = require('q');
var _ = require('underscore');

var mongoose = require('mongoose-q')(require('mongoose'), {spread:true});
var Schema = mongoose.Schema;

exports.attachNotificationListenersToSchema = function (schema, options) {
  var ignoredPaths = options.ignoredPaths;
  var ignoredPathsHash;
  if(ignoredPaths) {
    ignoredPathsHash = {};
    ignoredPaths.forEach(function(path) {
      ignoredPathsHash[path] = true;
    });

  } else {
    ignoredPathsHash = null;
  }

  if(options.onCreate || options.onUpdate) {
    schema.pre('save', function (next) {
      var isNewInstance = this.isNew;

      if(ignoredPaths) {
        var allIgnored = this.modifiedPaths().every(function(path) { return ignoredPathsHash[path]; });
        if(allIgnored) {
          return next();
        }
      }

      this.get('_tv').increment();

      this.post('save', function(postNext) {
        if(isNewInstance) {
          if(options.onCreate) options.onCreate(this, postNext);
        } else {
          if(options.onUpdate) options.onUpdate(this, postNext);
        }
      });

      next();
    });
  }

  if(options.onRemove) {
    schema.post('remove', function(model, numAffected) {
      options.onRemove(model, numAffected);
    });
  }

};

// Adapts a mongoose promise to q
exports.monq = function(promise) {
  var deferred = Q.defer();

  promise.addCallback(deferred.resolve);
  promise.addErrback(deferred.reject);

  return deferred.promise;

};

exports.cloneSchema = function(schema) {
  var tree = _.extend({}, schema.tree);
  delete tree.id;
  delete tree._id;
  return new Schema(tree);
}

