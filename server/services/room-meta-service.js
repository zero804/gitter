"use strict";

var assert = require('assert');
var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var processMarkdown = require('../utils/markdown-processor');


function findMetaByTroupeId(troupeId, metaKey) {
  assert(mongoUtils.isLikeObjectId(troupeId));
  assert(metaKey);
  troupeId = mongoUtils.asObjectID(troupeId);
  return persistence.TroupeMeta.findOne({ troupeId: troupeId }).select(metaKey)
    .exec()
    .then(function(result){
      return result[metaKey];
    });
}

function upsertMetaKey(troupeId, data) {
  assert(mongoUtils.isLikeObjectId(troupeId));
  troupeId = mongoUtils.asObjectID(troupeId);

  data = (data || {});
  data.welcomeMessage = (data.welcomeMessage || '');

  return processMarkdown(data.welcomeMessage)
    .then(function(parsedWelcomeMessage) {

      var query = {
        $set: {
          welcomeMessage: {
            html: parsedWelcomeMessage.html,
            text: parsedWelcomeMessage.text
          }
        }
      };
      return persistence.TroupeMeta.findOneAndUpdate(
        { troupeId: troupeId }, query, { upsert: true }
      );
    });
}

module.exports = {
  findMetaByTroupeId: findMetaByTroupeId,
  upsertMetaKey: upsertMetaKey,
};
