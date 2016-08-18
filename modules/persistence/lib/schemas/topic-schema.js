'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

var TopicSchema = new Schema({
  forumId: { type: ObjectId, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  categoryId: { type: ObjectId, required: true },
  tags: [String],
  sticky: { type: Number, "default": 0},
  text: { type: String },
  html: { type: String },
  userId: { type: ObjectId, required: true },
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  lastModified: { type: Date, "default": null },
  lang: {type: String },
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: {type: Number }
}, { strict: 'throw' });

TopicSchema.schemaTypeName = 'TopicSchema';
// Should any/all of these be sparse?
TopicSchema.index({ forumId: 1 });

installVersionIncMiddleware(TopicSchema);

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Topic', TopicSchema);

    return {
      model: Model,
      schema: TopicSchema
    };
  }
};
