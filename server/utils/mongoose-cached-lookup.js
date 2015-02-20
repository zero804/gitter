'use strict';

var LRU = require("lru-cache");
var Q = require("q");
var mongoUtils = require('./mongo-utils');
var _ = require('underscore');

function MongooseCachedLookup(options) {
  var model = options.model;
  var cache = LRU({
    max: options.max || 128,
    maxAge: options.maxAge || 60 * 1000 // 1 minute
  });

  this.get = function(id) {
    /* Ensure the ID is a string */
    id = mongoUtils.serializeObjectId(id);
    if(!id) return Q.resolve();

    var cached = cache.get(id);
    if (cached) return Q.resolve(_.clone(cached)); // Shallow clone only!

    return model.findByIdQ(id, undefined, { lean: true })
      .then(function(doc) {
        doc.id = mongoUtils.serializeObjectId(doc._id);
        cache.set(id, doc);
        return doc;
      });
  };
}


module.exports = MongooseCachedLookup;
