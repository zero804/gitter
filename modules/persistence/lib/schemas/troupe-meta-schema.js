var mongoose                    = require('gitter-web-mongoose-bluebird');
var Schema                      = mongoose.Schema;
var ObjectId                    = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');


var TroupeMetaSchema = new Schema({
  //TODO Fixme this breaks
  troupe: { type: ObjectId, required: true, /* unique: true, index: true */ },
  welcomeMessage: {
    html: String,
    text: String
  }
});

TroupeMetaSchema.schemaTypeName = 'TroupeMetaSchema';

installVersionIncMiddleware(TroupeMetaSchema);

module.exports = {
  install: function(mongooseConnection){
    var model = mongooseConnection.model('TroupeMeta', TroupeMetaSchema);
    return {
      model:  model,
      schema: TroupeMetaSchema,
    };
  }
};
