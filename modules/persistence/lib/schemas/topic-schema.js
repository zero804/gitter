'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

/*
A note on all the different date fields:

**sent** is filled in when the topic is created

**editedAt** is usually null, but gets set whenever the topic itself  (ie the
title or text) is changed.

**lastChanged** is the "business logic" date field used when ordering topics by
most recent activity.

In this case activity is defined as:
* The topic was first created.
* A reply was added.
* A comment was added.

Therefore the topic or a reply/comment being edited or removed doesn't count.
ie That probably doesn't notify watchers or "bump" the topic back up the sort
list.

**lastModified** is the "technical" date field used with things like http
conditional get. It should be set any time anything on a topic or one of its
replies or comments gets changed.

Therefore:
* all of the actions that would set/change lastChanged
* topic, reply or comment updated
* reply or comment removed
*/

var TopicSchema = new Schema({
  forumId: { type: ObjectId, required: true },
  title: { type: String, required: true },
  number: { type: Number, required: true },
  slug: { type: String, required: true },
  categoryId: { type: ObjectId, required: true },
  tags: [String],
  sticky: { type: Number, "default": 0},
  text: { type: String },
  html: { type: String },
  userId: { type: ObjectId, required: true },
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  lastChanged: {type: Date, "default": Date.now },
  lastModified: { type: Date, "default": Date.now },
  repliesTotal: { type: Number, "default": 0 },
  lang: {type: String },
  reactionCounts: Schema.Types.Mixed,
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: {type: Number },
}, { strict: 'throw' });

TopicSchema.schemaTypeName = 'TopicSchema';
TopicSchema.index({ forumId: 1 });
TopicSchema.index({ categoryId: 1 });
TopicSchema.index({ userId: 1 });
TopicSchema.index({ lastChanged: 1 });
TopicSchema.index({ repliesTotal: 1 });

TopicSchema.index({ forumId: 1, number: 1 }, {
  unique: true,
  background: true
});

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
