'use strict';

function presentCommunityCreateDialog(options) {
  var groupsCollection = options.groups;
  var dialogRegion = options.dialogRegion;
  var orgCollection = options.orgCollection;

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

    var unusedRepoCollection = new RepoCollection();
    var repoCollection = new RepoCollection();
    var unusedOrgCollection = new OrgCollection();

    // Fetch some data
    repoCollection.fetch();
    unusedRepoCollection.fetch({ data: { type: 'unused' } });
    unusedOrgCollection.fetch({ data: { type: 'unused' } });

    var communityCreateModel = new CommunityCreateModel({ }, {
      repoCollection: repoCollection,
      orgCollection: orgCollection
    });

    var communityCreateView = new CommunityCreateView({
      model: communityCreateModel,
      orgCollection: orgCollection,
      unusedOrgCollection: unusedOrgCollection,
      repoCollection: repoCollection,
      unusedRepoCollection: unusedRepoCollection,
      groupsCollection: groupsCollection
    });

    dialogRegion.show(communityCreateView);

  });
}

module.exports = presentCommunityCreateDialog;
