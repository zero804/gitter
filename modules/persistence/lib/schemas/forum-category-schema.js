'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  lcSlug: { type: String, required: true },
  forumId: { type: ObjectId, required: true },

  // TODO: sort order, security descriptor, etc.

}, { strict: 'throw' });

ForumCategorySchema.schemaTypeName = 'ForumCategorySchema';
ForumCategorySchema.index({ forumId: 1 });
ForumCategorySchema.index({ lcSlug: 1 });
ForumCategorySchema.index({ forumId: 1, lcSlug: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumCategory', ForumCategorySchema);

    return {
      model: Model,
      schema: ForumCategorySchema
    };
  }
};
