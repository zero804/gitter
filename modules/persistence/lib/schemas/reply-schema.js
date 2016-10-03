'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

var ReplySchema = new Schema({
  forumId: { type: ObjectId, required: true },
  topicId: { type: ObjectId, required: true },
  text: { type: String },
  html: { type: String },
  userId: {type: ObjectId, required: true},
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  lastChanged: { type: Date, "default": Date.now },
  lastModified: { type: Date, "default": Date.now },
  commentsTotal: { type: Number, "default": 0 },
  lang: {type: String },
  reactionCounts: Schema.Types.Mixed,
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: {type: Number }
}, { strict: 'throw' });

ReplySchema.schemaTypeName = 'ReplySchema';
ReplySchema.index({ forumId: 1 });
ReplySchema.index({ topicId: 1 });
ReplySchema.index({ lastChanged: 1 });
ReplySchema.index({ commentsTotal: 1 });

installVersionIncMiddleware(ReplySchema);

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Reply', ReplySchema);

    return {
      model: Model,
      schema: ReplySchema
    };
  }
};
