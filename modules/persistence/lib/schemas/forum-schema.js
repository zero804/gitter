'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  tags: [String],
  topicsTotal: { type: Number, "default": 0 }
}, { strict: 'throw' });

ForumSchema.schemaTypeName = 'ForumSchema';

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Forum', ForumSchema);

    return {
      model: Model,
      schema: ForumSchema
    };
  }
};
