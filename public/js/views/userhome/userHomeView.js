define([
  'jquery',
  'marionette',
  'backbone',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  'hbs!./tmpl/userHomeEmptyOrgView',
  './homeOrgCollectionView',
  './homeRepoCollectionView',
  'utils/is-mobile'
], function($, Marionette, backbone, context, troupeCollections, userHomeTemplate, userHomeEmptyOrgViewTemplate, OrgCollectionView, RepoCollectionView, isMobile) {
  "use strict";

  var suggestedRoomsCollection = new backbone.Collection();
  suggestedRoomsCollection.url = '/api/v1/user/' + context.getUserId() + '/rooms?suggested=1';
  suggestedRoomsCollection.fetch();

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
        collection: troupeCollections.orgs,
        emptyView: Marionette.ItemView.extend({ template: userHomeEmptyOrgViewTemplate })
      }));
      this.suggestedRooms.show(new RepoCollectionView({ collection: suggestedRoomsCollection }));
    },

    serializeData: function() {
      var user = context.getUser();
      var hasPrivateRepoScope = !!user.scopes.private_repo;

      return {
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

});
