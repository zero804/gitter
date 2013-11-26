/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  './homeOrgCollectionView'
], function(Marionette, context, troupeCollections, userHomeTemplate, OrgCollectionView) {
  "use strict";

  return Marionette.Layout.extend({
    template: userHomeTemplate,
    tagName: 'div',

    regions: {
      orgs: "#org-list",
      repos: "#repos-list"
    },

    onRender: function() {
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs }));
    },

    getRenderData: function() {
      return {
        username: context.getUser().username,
        basePath: context.env('basePath'),
        baseServer: context.env('baseServer')
      };
    }
  });

});
