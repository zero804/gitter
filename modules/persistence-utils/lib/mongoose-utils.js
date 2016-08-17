"use strict";

var _ = require('lodash');
var Promise = require('bluebird');
var mongoUtils = require('./mongo-utils');
var uniqueIds = require('mongodb-unique-ids');

function idsIn(ids) {
  return uniqueIds(ids).filter(function(id) { return !!id; });
}

function hashList(list) {
  if(!list) return null;

  return list.reduce(function(memo, item) {
    memo[item] = true;
    return memo;
  }, {});
}

function attachNotificationListenersToSchema(schema, options) {
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

}

var MAX_UPSERT_ATTEMPTS = 2;
var MONGO_DUPLICATE_KEY_ERROR = 11000;

/**
 * Performs a safe upsert,
 * returns an Promise of a boolean indicating
 * that the document already exists
 *   - true: means the query matched an existing document
 *   - false: means a new document was inserted
 */
function leanUpsert(schema, query, setOperation) {
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
      return !!doc;
    });
}

/*
 * Returns a promise [document, updatedExisting]
 * If mongo experiences a contention where it tries to
 * perform an insert but looses the battle to another
 * insert, this function will retry
 */
function upsert(schema, query, setOperation) {
  return leanUpsert(schema, query, setOperation)
    .then(function(existing) {
      // If doc is null then an insert occurred
      return Promise.all([schema.findOne(query).exec(), existing]);
    });
}

/**
 * Returns a promise of documents
 */
function findByIds(Model, ids, callback) {
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
    return Model.where('_id')['in'](mongoUtils.asObjectIDs(idsIn(ids))).exec();
  }).nodeify(callback);
}

/**
 * Returns a promise of lean documents
 */
function findByIdsLean(Model, ids, select) {
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
      .in(mongoUtils.asObjectIDs(idsIn(ids)))
      .select(select)
      .lean()
      .exec()
      .then(mongoUtils.setIds);

  });
}

function addIdToLean(object) {
  if (object && object._id) { object.id = object._id.toString(); }
  return object;
}

function addIdToLeanArray(objects) {
  if (objects) {
    objects.forEach(function(f) {
      if (f && f._id) { f.id = f._id.toString(); }
    });
  }
  return objects;
}

function getEstimatedCountForId(Model, field, id) {
  var query = {};
  query[field] = id;
  return Model.count(query)
    .read('secondaryPreferred')
    .exec();
}

function getEstimatedCountForIds(Model, field, ids) {
  if (!ids || !ids.length) return {};

  if (ids.length === 1) {
    var singleId = ids[0];
    return getEstimatedCountForId(Model, field, singleId)
      .then(function(count) {
        var hash = {};
        hash[singleId] = count;
        return hash;
      });
  }

  var query = {};
  query[field] = { $in: ids }
  return Model.aggregate([{
      $match: query
    }, {
      $group: {
        _id: '$' + field,
        count: { $sum: 1 }
      }
    }])
    .read('secondaryPreferred')
    .exec()
    .then(function(results) {
      if (!results || !results.length) return {};

      return _.reduce(results, function(memo, result) {
        memo[result._id] = result.count;
        return memo;
      }, {});
    });
}

module.exports = {
  attachNotificationListenersToSchema: attachNotificationListenersToSchema,
  leanUpsert: leanUpsert,
  upsert: upsert,
  findByIds: findByIds,
  findByIdsLean: findByIdsLean,
  addIdToLean: addIdToLean,
  addIdToLeanArray: addIdToLeanArray,
  getEstimatedCountForId: getEstimatedCountForId,
  getEstimatedCountForIds: getEstimatedCountForIds
};
