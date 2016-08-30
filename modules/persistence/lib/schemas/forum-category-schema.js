'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  forumId: { type: ObjectId, required: true },
  order: { type: Number, "default": 10000000000, required: false }
}, { strict: "throw" });

ForumCategorySchema.schemaTypeName = 'ForumCategorySchema';
ForumCategorySchema.index({ forumId: 1 });
ForumCategorySchema.index({ forumId: 1, slug: 1 }, { unique: true });
ForumCategorySchema.index({ order: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumCategory', ForumCategorySchema);

    return {
      model: Model,
      schema: ForumCategorySchema
    };
  }
};
