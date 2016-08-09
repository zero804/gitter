'use strict';

var _ = require('underscore');

var context = require('utils/context');
var appEvents = require('utils/appevents');

var repoModels = require('collections/repos');
var RepoCollection = repoModels.ReposCollection;
var orgModels = require('collections/orgs');
var OrgCollection = orgModels.OrgCollection;
var groupModels = require('collections/groups');
var CommunityCreateModel = require('views/community-create/community-create-model');
var CreateRoomModel = require('models/create-room-view-model');

var generateRoutes = function(appLayout, options) {
  options = options || {
    // groupCollection
    // roomCollection
    // orgCollection
    // repoCollection
  };

  var unusedRepoCollection = new RepoCollection();
  var unusedOrgCollection = new OrgCollection();

  var initializeUnusedRepoCollection = _.once(function() {
    return unusedRepoCollection.fetch({
      data: {
          type: 'unused'
        }
      },
      {
        add: true,
        remove: true,
        merge: true
      }
    );
  });

  var initializeUnusedOrgCollection = _.once(function() {
    return unusedOrgCollection.fetch({
      data: {
          type: 'unused'
        }
      },
      {
        add: true,
        remove: true,
        merge: true
      }
    );
  });


  var adminGroupsCollection = new groupModels.Collection([]);
  var initializeAdminGroupsCollection = _.once(function() {
    return adminGroupsCollection.fetch({
      data: {
          type: 'admin'
        }
      },
      {
        add: true,
        remove: true,
        merge: true
      }
    );
  });


  var communityCreateModel = new CommunityCreateModel({
    active: false
  });


  var getSuitableGroupId = function() {
    var groupId = null;

    var menuBarGroup = appLayout.getRoomMenuModel().getCurrentGroup();
    if(menuBarGroup) {
      groupId = menuBarGroup.get('id');
    }
    else {
      var slimCurrentTroupe = context.troupe();
      var currentTroupe = options.roomCollection.get(slimCurrentTroupe.get('id'));

      if(currentTroupe) {
        groupId = currentTroupe.get('groupId');
      }
      // Last ditch effort, perhaps they are visiting a room they haven't joined
      // on page load and we can see the full troupe
      else {
        groupId = slimCurrentTroupe.get('groupId');
      }
    }

    return groupId;
  };


  appEvents.on('community-create-view:toggle', function(active) {
    communityCreateModel.set('active', active);
    if(active) {
      window.location.hash = '#createcommunity';
    }
  });


  var routes = {
    createRoom: function(initialRoomName) {
      initializeAdminGroupsCollection()
        .then(function() {
          // Redirect to create community flow if no communities to select from
          if(adminGroupsCollection.length === 0) {
            window.location.hash = '#createcommunity';
          }
        });

      if(options.repoCollection.length === 0) {
        options.repoCollection.fetch();
      }

      require.ensure(['views/modals/create-room-view'], function(require) {
        var createRoomView = require('views/modals/create-room-view');
        var modal = new createRoomView.Modal({
          model: new CreateRoomModel(),
          initialGroupId: getSuitableGroupId(),
          initialRoomName: initialRoomName,
          groupsCollection: adminGroupsCollection,
          roomCollection: options.roomCollection,
          repoCollection: options.repoCollection
        });

        appLayout.dialogRegion.show(modal);
      });
    },

    createCommunity: function() {
      initializeUnusedRepoCollection();
      initializeUnusedOrgCollection();

      require.ensure(['views/community-create/community-create-view'], function(require) {
        var CommunityCreateView = require('views/community-create/community-create-view');
        communityCreateModel.set('active', true);
        var communityCreateView = new CommunityCreateView({
          model: communityCreateModel,
          orgCollection: options.orgCollection,
          unusedOrgCollection: unusedOrgCollection,
          repoCollection: options.repoCollection,
          unusedRepoCollection: unusedRepoCollection,
          groupsCollection: options.groupCollection
        });

        appLayout.dialogRegion.show(communityCreateView);
      });
    },
  };

  return routes;
};


module.exports = generateRoutes;
