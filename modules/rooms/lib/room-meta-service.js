'use strict';

var assert = require('assert');
var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

async function findMetaByTroupeId(troupeId, metaKeys) {
  assert(mongoUtils.isLikeObjectId(troupeId));
  assert(metaKeys);
  troupeId = mongoUtils.asObjectID(troupeId);

  const selectId = { _id: 0 };
  const select = metaKeys.reduce((acc, key) => ({ ...acc, [key]: 1 }), selectId);

  const meta = await persistence.TroupeMeta.findOne({ troupeId: troupeId }, select)
    .lean()
    .exec();
  return meta || {}; // empty object instead of undefined allows safe destructuring in clients
}

function upsertMetaKey(troupeId, metaKey, value) {
  assert(troupeId && mongoUtils.isLikeObjectId(troupeId));

  troupeId = mongoUtils.asObjectID(troupeId);
  var query = { $set: {} };
  query.$set[metaKey] = value;

  return persistence.TroupeMeta.findOneAndUpdate({ troupeId: troupeId }, query, {
    upsert: true
  }).exec();
}

module.exports = {
  findMetaByTroupeId: findMetaByTroupeId,
  upsertMetaKey: upsertMetaKey
};
