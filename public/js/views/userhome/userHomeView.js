/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  './homeOrgCollectionView',
  './homeRepoCollectionView',
  'collections/repos',
], function(Marionette, context, troupeCollections, userHomeTemplate, OrgCollectionView, RepoCollectionView, repoModels) {
  "use strict";

  var reposCollection = new repoModels.ReposCollection(null, { listen: true });
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
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs }));
      this.repos.show(new RepoCollectionView({ collection: reposCollection }));
    },

    serializeData: function() {
      var user = context.getUser();
      return {
        privateRepoScope: !!user.scopes.private_repo,
        createRoom: context.getUser().createRoom
      };
    },

    onUpgradeAuthClick: function(e) {
      var target = e.target.href;
      window.open(target);
      e.preventDefault();
    }

  });

});
