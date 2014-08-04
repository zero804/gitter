define([
  'jquery',
  'marionette',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  'hbs!./tmpl/userHomeEmptyOrgView',
  './homeOrgCollectionView',
  './homeRepoCollectionView',
  'collections/repos',
  'utils/is-mobile'
], function($, Marionette, context, troupeCollections, userHomeTemplate, userHomeEmptyOrgViewTemplate, OrgCollectionView, RepoCollectionView, repoModels, isMobile) {
  "use strict";

  var reposCollection = new repoModels.ReposCollection();
  reposCollection.fetch();

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
        collection: troupeCollections.orgs
      }));
      this.repos.show(new RepoCollectionView({ collection: reposCollection }));
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
