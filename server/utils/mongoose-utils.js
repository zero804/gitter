"use strict";

var Promise     = require('bluebird');
var _           = require('underscore');
var collections = require('./collections');
var mongoUtils  = require('./mongo-utils');
var mongoose    = require('gitter-web-mongoose-bluebird');
var Schema      = mongoose.Schema;

function hashList(list) {
  if(!list) return null;

  return list.reduce(function(memo, item) {
    memo[item] = true;
    return memo;
  }, {});
}

exports.attachNotificationListenersToSchema = function (schema, options) {
  var blacklistHash = hashList(options.ignoredPaths);
  var whitelistHash = hashList(options.listenPaths);

  if(blacklistHash && whitelistHash) {
    throw new Error('Please specify either ignoredPaths (blacklist) or listenPaths (whitelist) or neither, not both');
  }

  function canIgnore(model) {
    var modified = model.modifiedPaths();
    if (modified.length === 0) {
      return true; // No changes
    }

    if (blacklistHash) {
      var allBlacklisted = modified.every(function(path) { return blacklistHash[path]; });
      if (allBlacklisted) {
        return true; // All modified paths can be ignored
      }
      return false;
    }

    if (whitelistHash) {
      var someWhitelisted = modified.some(function(path) { return whitelistHash[path]; });
      if (someWhitelisted) {
        return false; // Things on the whitelist - handle this modification
      } else {
        return true; // Nothing on the whitelist, ignore
      }
    }

    return false;
  }

  if(options.onCreate || options.onUpdate) {
    schema.pre('save', function (next) {
      if (canIgnore(this)) {
        return next();
      }

      var isNewInstance = this.isNew;

      this.get('_tv').increment();

      if(this._skipTroupeMiddleware) {
        delete this._skipTroupeMiddleware;
        return next();
      }

      this._gIsNew = isNewInstance;
      next();
    });

    schema.post('save', function(doc, postNext) {
      var isNewInstance = doc._gIsNew;
      delete doc._gIsNew;
      if(isNewInstance) {
        if(options.onCreate) return options.onCreate(doc, postNext);
      } else {
        if(options.onUpdate) return options.onUpdate(doc, postNext);
      }
      return postNext();
    });

  }

  if(options.onRemove) {
    schema.post('remove', function(model) {
      options.onRemove(model);
    });
  }

};

exports.cloneSchema = function(schema) {
  var tree = _.extend({}, schema.tree);
  delete tree.id;
  delete tree._id;
  return new Schema(tree);
};

/*
 * Returns a promise [document, updatedExisting]
 * If mongo experiences a contention where it tries to
 * perform an insert but looses the battle to another
 * insert, this function will retry
 */
var MAX_UPSERT_ATTEMPTS = 2;
var MONGO_DUPLICATE_KEY_ERROR = 11000;

exports.upsert = function(schema, query, setOperation) {
  var attempts = 0;

  function performUpdate() {
    attempts++;
    return schema.findOneAndUpdate(query, setOperation, { upsert: true, new: false })
      .exec()
      .catch(function(err) {
        if (attempts >= MAX_UPSERT_ATTEMPTS) throw err;
        if (!mongoUtils.isMongoError(err)) throw err;
        if (err.code !== MONGO_DUPLICATE_KEY_ERROR) throw err;
        
        return performUpdate();
      });
  }

  return performUpdate()
    .then(function(doc) {
      // If doc is null then an insert occurred
      return Promise.all([schema.findOne(query).exec(), !!doc]);
    });
};

/**
 * Returns a promise of documents
 */
exports.findByIds = function(Model, ids, callback) {
  return Promise.try(function() {
    if (!ids || !ids.length) return [];

    /* Special case for a single ID */
    if (ids.length === 1) {
      return Model.findById(ids[0])
        .exec()
        .then(function(doc) {
          if (doc) return [doc];
          return [];
        });
    }

    /* Usual case */
    return Model.where('_id')['in'](mongoUtils.asObjectIDs(collections.idsIn(ids))).exec();
  }).nodeify(callback);
};

/**
 * Returns a promise of lean documents
 */
exports.findByIdsLean = function(Model, ids, select) {
  return Promise.try(function() {
    if (!ids || !ids.length) return [];

    /* Special case for a single ID */
    if (ids.length === 1) {
      return Model.findById(ids[0], select, { lean: true })
        .exec()
        .then(function(doc) {
          if (doc) return [mongoUtils.setId(doc)];
          return [];
        });
    }

    /* Usual case */
    return Model.where('_id')
      .in(mongoUtils.asObjectIDs(collections.idsIn(ids)))
      .select(select)
      .lean()
      .exec()
      .then(mongoUtils.setIds);

  });
};

exports.findByFieldInValue = function(Model, field, values, callback) {
  return Promise.try(function() {
    if (!values || !values.length) return [];

    /* Special case for a single value */
    if (values.length === 1) {
      var query = {};
      query[field] = values[0];
      return Model.findOne(query)
        .exec()
        .then(function(doc) {
          if (doc) return [doc];
          return [];
        });
    }

    /* Usual case */
    return Model.where(field).in(values).exec();
  }).nodeify(callback);
};

exports.addIdToLean = function(object) {
  if (object && object._id) { object.id = object._id.toString(); }
  return object;
};

exports.addIdToLeanArray = function(objects) {
  if (objects) {
    objects.forEach(function(f) {
      if (f && f._id) { f.id = f._id.toString(); }
    });
  }
  return objects;
};
