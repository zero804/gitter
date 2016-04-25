"use strict";
var $ = require('jquery');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var troupeCollections = require('collections/instances/troupes');
var FilteredSuggestedRoomsCollection = require('collections/suggested-rooms').Filtered;
var userHomeTemplate = require('./tmpl/userHomeTemplate.hbs');
var OrgCollectionView = require('./homeOrgCollectionView');
var SuggestedCollectionView = require('./suggested-room-collection-view');
var isMobile = require('utils/is-mobile');
require('views/behaviors/isomorphic');

module.exports = (function() {

  return Marionette.LayoutView.extend({
    template: userHomeTemplate,

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
    },

    behaviors: {
      Isomorphic: {
        orgs: { el: "#org-list", init: 'initOrgsRegion' },
        suggestedRooms: { el: "#suggested-room-list", init: 'initSuggestedRoomsRegion' },
      }
    },

    initOrgsRegion: function(optionsForRegion) {
      return new OrgCollectionView(optionsForRegion({ collection: troupeCollections.orgs }));
    },

    initSuggestedRoomsRegion: function(optionsForRegion) {
      var suggestedRoomCollection = new FilteredSuggestedRoomsCollection({ roomsCollection: troupeCollections.troupes });
      suggestedRoomCollection.fetchForUser();

      return new SuggestedCollectionView(optionsForRegion({ collection: suggestedRoomCollection }));
    },

    onRender: function() {
      $('#header-wrapper').hide(); // Why?
    },

    getUserTimestamp: function(id) {
      return new Date(parseInt(id.toString().slice(0,8), 16)*1000);
    },

    serializeData: function() {
      var user = context.getUser();
      var hasPrivateRepoScope = !!user && !!user.scopes && !!user.scopes.private_repo;

      return {
        basePath: clientEnv['basePath'],
        showUpgradeAuthLink: !isMobile() && !hasPrivateRepoScope
      };
    },

    onUpgradeAuthClick: function(e) {
      var target = e.target.href;

      window.addEventListener("message", function(event) {
        if(event.data === 'oauth_upgrade_complete') {
          window.location.reload(true);
        }
      }, false);

      window.open(target);
      e.preventDefault();
    }

  });


})();
