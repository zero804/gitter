"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;
var ObjectId      = Schema.ObjectId;

var UserTroupeFavouritesSchema = new Schema({
  userId: { type: ObjectId },
  favs: Schema.Types.Mixed
});
UserTroupeFavouritesSchema.index({ userId: 1 }); // Should be unique no?
UserTroupeFavouritesSchema.schemaTypeName = 'UserTroupeFavourites';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('UserTroupeFavourites', UserTroupeFavouritesSchema);

    return {
      model: model,
      schema: UserTroupeFavouritesSchema
    };
  }
};
