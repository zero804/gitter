'use strict';

var appEvents = require('../utils/appevents');

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

    var communityCreateModel = new CommunityCreateModel({
        active: true
      }, {
      orgs: orgs,
      repos: repos,
    });

    communityCreateModel.refreshGitHubCollections();

    var communityCreateView = new CommunityCreateView({
      model: communityCreateModel
    });

    // Track this event
    appEvents.trigger('stats.event', 'community.create.enter');
    appEvents.trigger('track-event', 'community.create.enter');

    function onActiveChange() {
      if (communityCreateModel.get('active')) return;
      communityCreateModel.stopListening(communityCreateModel, 'change:active', onActiveChange);

      var stepState = communityCreateModel.get('stepState');
      appEvents.trigger('stats.event', 'community.create.exit.' + stepState);
      appEvents.trigger('track-event', 'community.create.exit.' + stepState);

      window.location = '#';
    }

    communityCreateModel.listenTo(communityCreateModel, 'change:active', onActiveChange);

    dialogRegion.show(communityCreateView);

  });
}

module.exports = presentCommunityCreateDialog;
