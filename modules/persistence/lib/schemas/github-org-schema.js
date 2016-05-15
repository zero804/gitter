'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;

var GitHubOrgSchema = new Schema({
  uri: { type: String },
  lcUri: { type: String },
  githubId: { type: String },
});

GitHubOrgSchema.schemaTypeName = 'GitHubOrgSchema';
GitHubOrgSchema.index({ uri: 1 }, { unique: true });
GitHubOrgSchema.index({ lcUri: 1 }, { unique: true });
GitHubOrgSchema.index({ githubId: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('GitHubOrg', GitHubOrgSchema);
    return {
      model: model,
      schema: GitHubOrgSchema
    };
  }
};
