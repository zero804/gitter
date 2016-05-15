'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;

var GitHubUserSchema = new Schema({
  uri: { type: String },
  lcUri: { type: String },
  githubId: { type: String },
});

GitHubUserSchema.schemaTypeName = 'GitHubUserSchema';
GitHubUserSchema.index({ uri: 1 }, { unique: true });
GitHubUserSchema.index({ lcUri: 1 }, { unique: true });
GitHubUserSchema.index({ githubId: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('GitHubUser', GitHubUserSchema);
    return {
      model: model,
      schema: GitHubUserSchema
    };
  }
};
