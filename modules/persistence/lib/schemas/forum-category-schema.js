'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  forumId: { type: ObjectId, required: true },
  /*
  Go with a large number by default so that new ones get added to the end.
  Otherwise mongo returns undefined/null at the start when you ask to order by
  a number, ascending. Using Math.pow(2, 31)-1 just in case there are any max
  int bugs around 32/64 bits or signed/unsigned, etc.

  Other alternatives would be to ALWAYS fill in order (ie. make it required) or
  to go withe order number, descending and make the default -1. But then if you
  want to fill in a known order number and add a new one you have to adjust
  them all. With ascending numbers you can just go with max order number +1.
  (Bringing you back into contact with potential max integer size bugs..)
  */
  order: { type: Number, "default": 2147483647, required: false }
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
