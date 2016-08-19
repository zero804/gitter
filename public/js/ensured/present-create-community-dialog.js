'use strict';

function presentCommunityCreateDialog(options) {
  var dialogRegion = options.dialogRegion;

  require.ensure([
    '../views/community-create/community-create-view',
    '../views/community-create/community-create-model',
    '../collections/repos',
    '../collections/orgs'
  ], function(require) {
    var CommunityCreateView = require('../views/community-create/community-create-view');
    var CommunityCreateModel = require('../views/community-create/community-create-model');
    var repoModels = require('../collections/repos');
    var orgModels = require('../collections/orgs');

    var RepoCollection = repoModels.ReposCollection;
    var OrgCollection = orgModels.OrgCollection;

    var repos = new RepoCollection();
    var orgs = new OrgCollection();

    var communityCreateModel = new CommunityCreateModel({ }, {
      orgs: orgs,
      repos: repos,
    });

    communityCreateModel.refreshGitHubCollections();

    var communityCreateView = new CommunityCreateView({
      model: communityCreateModel
    });

    dialogRegion.show(communityCreateView);

  });
}

module.exports = presentCommunityCreateDialog;
