"use strict";
var $ = require('jquery');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var troupeCollections = require('collections/instances/troupes');
var userHomeTemplate = require('./tmpl/userHomeTemplate.hbs');
var OrgCollectionView = require('./homeOrgCollectionView');
var SuggestedCollectionView = require('./suggested-room-collection-view');
var isMobile = require('utils/is-mobile');
var isNative = require('utils/is-native');
var TroupeCollections = require('collections/troupes');
require('views/behaviors/isomorphic');

module.exports = (function() {

  var user = context.getUser();
  var prettyWelcome = (parseInt(user.id.slice(-1), 16) % 2) === 0;

  var hash = window.location.hash;
  // manual override
  if (hash.match(/pretty/)) {
    prettyWelcome = true;
  }

  if (hash.match(/personality/)) {
    prettyWelcome = false;
  }

  return Marionette.LayoutView.extend({
    template: userHomeTemplate,
    tagName: 'div',

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
    },

    regions: {
      orgs: "#org-list",
      suggestedRooms: "#suggested-room-list"
    },

    behaviors: {
      Isomorphic: {}
    },

    initRegions: function(optionsForRegion) {
      if (prettyWelcome) return {};

      var suggestedRoomCollection = new TroupeCollections.SuggestedTroupeCollection();
      suggestedRoomCollection.fetch();

      return {
        orgs: new OrgCollectionView(optionsForRegion('orgs', { collection: troupeCollections.orgs })),
        suggestedRooms: new SuggestedCollectionView(optionsForRegion('suggestedRooms', { collection: suggestedRoomCollection }))
      };
    },

    onRender: function() {
      $('#header-wrapper').hide(); // Why?
    },

    getUserTimestamp: function(id) {
      return new Date(parseInt(id.toString().slice(0,8), 16)*1000);
    },

    serializeData: function() {
      var user = context.getUser();
      var hasPrivateRepoScope = !!user.scopes.private_repo;

      return {
        basePath: context.env('basePath'),
        showUpgradeAuthLink: !isMobile() && !hasPrivateRepoScope,
        prettyWelcome: !isMobile() && !isNative() && prettyWelcome
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
