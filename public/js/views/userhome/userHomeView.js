define([
  'jquery',
  'marionette',
  'backbone',
  'moment',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  'hbs!./tmpl/userHomeEmptyOrgView',
  './homeOrgCollectionView',
  './suggested-room-collection-view',
  'utils/is-mobile',
  'utils/appevents'
], function($, Marionette, backbone, moment, context, troupeCollections, userHomeTemplate, userHomeEmptyOrgViewTemplate, OrgCollectionView, SuggestedCollectionView, isMobile, appEvents) {
  "use strict";

  var suggestedRoomCollection = new backbone.Collection();
  suggestedRoomCollection.url = '/api/v1/user/' + context.getUserId() + '/rooms?suggested=1';
  suggestedRoomCollection.fetch();

  return Marionette.Layout.extend({
    template: userHomeTemplate,
    tagName: 'div',

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
    },

    regions: {
      orgs: "#org-list",
      suggestedRooms: "#suggested-room-list"
    },

    onRender: function() {
      $('#header-wrapper').hide();
      this.orgs.show(new OrgCollectionView({
        collection: troupeCollections.orgs
      }));
      this.suggestedRooms.show(new SuggestedCollectionView({ collection: suggestedRoomCollection }));
    },

    getUserTimestamp: function(id) {
      return new Date(parseInt(id.toString().slice(0,8), 16)*1000);
    },

    serializeData: function() {
      
      var user = context.getUser();
      var hasPrivateRepoScope = !!user.scopes.private_repo;
      var prettyWelcome = (parseInt(user.id.slice(-1), 16) % 2) === 0;

      // manual override
      if (window.location.hash.match(/pretty/))
        prettyWelcome = true;

      return {
        showUpgradeAuthLink: !isMobile() && !hasPrivateRepoScope,
        prettyWelcome: prettyWelcome
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

});
