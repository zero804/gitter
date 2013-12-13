/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  'utils/context',
  'collections/instances/troupes',
  'hbs!./tmpl/userHomeTemplate',
  'hbs!./tmpl/userHomeEmptyOrgView',
  './homeOrgCollectionView',
  './homeRepoCollectionView',
  'collections/repos'
], function($, Marionette, context, troupeCollections, userHomeTemplate, userHomeEmptyOrgViewTemplate, OrgCollectionView, RepoCollectionView, repoModels) {
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
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs, emptyView: Marionette.ItemView.extend({ template: userHomeEmptyOrgViewTemplate, serializeData: function() {
        var viewData = {};
        viewData.privateRepoScope = !!context.getUser().scopes.private_repo;
        return viewData;
      }}) }));
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
