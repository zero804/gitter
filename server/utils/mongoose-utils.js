/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";
var Q           = require('q');
var _           = require('underscore');
var collections = require('./collections');
var mongoUtils  = require('./mongo-utils');

var mongoose    = require('mongoose-q')(require('mongoose'), {spread:true});
var Schema      = mongoose.Schema;

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

      if(this._skipTroupeMiddleware) {
        delete this._skipTroupeMiddleware;
        return next();
      }

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
};

/*
 * Returns a promise [document, numAffected, raw]
 */
exports.upsert = function(schema, query, setOperation) {
  return schema.updateQ(query, setOperation, { upsert: true })
    .spread(function(numAffected, raw) {
      return [schema.findOneQ(query), numAffected, raw];
    });
};

/**
 * Returns a promise of documents
 */
exports.findByIds = function(Model, ids, callback) {
  return Q.fcall(function() {
    if(!ids || !ids.length) return [];

    return Model.where('_id')['in'](mongoUtils.asObjectIDs(collections.idsIn(ids))).execQ();
  }).nodeify(callback);
};
