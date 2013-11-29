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

    regions: {
      orgs: "#org-list",
      repos: "#repo-list"
    },

    onRender: function() {
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs }));
      this.repos.show(new RepoCollectionView({ collection: reposCollection }));
    },

    serializeData: function() {
      return {
        createRoom: context.getUser().createRoom
      }
    },

    getRenderData: function() {
      return {
        username: context.getUser().username,
        basePath: context.env('basePath'),
        baseServer: context.env('baseServer'),
        canCreate: context.getUser().createRoom
      };
    }
  });

});
