var env = require('gitter-web-env');
var assert = require('assert');
var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var processMarkdown = require('../utils/markdown-processor');

var errorReporter = env.errorReporter;

function findMetaByTroupeId(troupeId) {
  assert(mongoUtils.isLikeObjectId(troupeId));
  troupeId = mongoUtils.asObjectID(troupeId);
  return persistence.TroupeMeta.findOne({ troupeId: troupeId })
  .exec()
  .catch(function(err){
    //TODO err reporting?
  });
}

function roomHasWelcomeMessage(troupeId){
  assert(mongoUtils.isLikeObjectId(troupeId));
  troupeId = mongoUtils.asObjectID(troupeId);

  return Promise.fromCallback(function(callback) {
      persistence.TroupeMeta.findOne({ troupeId: troupeId }, callback);
    })
    .then(function(meta){
      meta = (meta || {});
      meta.welcomeMessage = (meta.welcomeMessage || {});
      return !!meta.welcomeMessage.text && !!meta.welcomeMessage.text.length;
    })
    .catch(function(err){
      //TODO error reporting
      //console.log(err);
    });
}

function createOrUpdateMetaRecord(troupeId, data) {
  assert(mongoUtils.isLikeObjectId(troupeId));
  troupeId = mongoUtils.asObjectID(troupeId);

  data = (data || {});
  data.welcomeMessage = (data.welcomeMessage || '');

  return processMarkdown(data.welcomeMessage)
    .then(function(parsedWelcomeMessage) {

      var data = {
        $set: {
          welcomeMessage: {
            html: parsedWelcomeMessage.html,
            text: parsedWelcomeMessage.text
          }
        }
      };

      return Promise.fromCallback(function(callback) {
        persistence.TroupeMeta.findOneAndUpdate({ troupeId: troupeId }, data, { upsert: true }, callback);
      });

    })
    .catch(function(err) {
      //TODO Error Reporting
      //console.log(err.message);
    });

}

module.exports = {
  findMetaByTroupeId: findMetaByTroupeId,
  createOrUpdateMetaRecord: createOrUpdateMetaRecord,
  roomHasWelcomeMessage: roomHasWelcomeMessage
};
