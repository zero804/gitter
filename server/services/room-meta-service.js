"use strict";

var assert = require('assert');
var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function findMetaByTroupeId(troupeId, metaKey) {
  assert(mongoUtils.isLikeObjectId(troupeId));
  assert(metaKey);
  troupeId = mongoUtils.asObjectID(troupeId);

  var select = { _id: 0 };
  select[metaKey] = 1;

  return persistence.TroupeMeta.findOne({ troupeId: troupeId }, select)
    .select(metaKey)
    .lean()
    .exec()
    .then(function(result) {
      if (!result) return null;
      return result[metaKey];
    });
}

function upsertMetaKey(troupeId, metaKey, value) {
  assert(troupeId && mongoUtils.isLikeObjectId(troupeId));

  troupeId = mongoUtils.asObjectID(troupeId);
  var query = { $set: { } };
  query.$set[metaKey] = value;

  return persistence.TroupeMeta.findOneAndUpdate({ troupeId: troupeId }, query, { upsert: true })
    .exec();
}

module.exports = {
  findMetaByTroupeId: findMetaByTroupeId,
  upsertMetaKey: upsertMetaKey,
};
