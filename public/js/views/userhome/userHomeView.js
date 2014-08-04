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

  var suggestionCollection = new backbone.Collection();
  suggestionCollection.url = '/api/v1/user/' + context.getUserId() + '/rooms?suggested=1';
  suggestionCollection.fetch();

  return Marionette.Layout.extend({
    template: userHomeTemplate,
    tagName: 'div',

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
    },

    regions: {
      orgs: "#org-list",
      repos: "#repo-list"
    },

    onRender: function() {
      $('#header-wrapper').hide();
      this.orgs.show(new OrgCollectionView({
        collection: troupeCollections.orgs,
        emptyView: Marionette.ItemView.extend({ template: userHomeEmptyOrgViewTemplate })
      }));
      this.repos.show(new RepoCollectionView({ collection: suggestionCollection }));
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
