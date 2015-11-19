"use strict";

var mongoose      = require('../../utils/mongoose-q');
var Schema        = mongoose.Schema;

var FeatureToggle = new Schema({
  name: String,
  critera: Schema.Types.Mixed
});
FeatureToggle.schemaTypeName = 'FeatureToggle';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('FeatureToggle', FeatureToggle);

    return {
      model: model,
      schema: FeatureToggle
    };
  }
};
