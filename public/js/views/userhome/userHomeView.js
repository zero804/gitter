/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  './homeOrgCollectionView',
  './homeRepoCollectionView'
], function(Marionette, context, troupeCollections, userHomeTemplate, OrgCollectionView, RepoCollectionView) {
  "use strict";

  return Marionette.Layout.extend({
    template: userHomeTemplate,
    tagName: 'div',

    regions: {
      orgs: "#org-list",
      repos: "#repo-list"
    },

    onRender: function() {
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs }));
      this.repos.show(new RepoCollectionView({ collection: troupeCollections.repos }));
    },

    serializeData: function() {
      console.log("createRoom:" + context.getUser().createRoom);
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
