/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'marionette',
  'views/base',
  'utils/context',
  // 'fineuploader',
  'hbs!./tmpl/rightToolbar',
  'collections/instances/integrated-items',
  'views/people/peopleCollectionView',
  'cocktail',
  'utils/uservoice',
  'views/widgets/troupeAvatar',
  './repoInfo'
], function($, Backbone, Marionette, TroupeViews, context, /*qq,*/ rightToolbarTemplate, itemCollections,
  PeopleCollectionView, cocktail, userVoice, TroupeAvatar, repoInfo) {
  "use strict";

  var RightToolbarLayout = Marionette.Layout.extend({
    tagName: "span",
    template: rightToolbarTemplate,

    regions: {
      people: "#people-roster",
      troupeAvatar: "#troupe-avatar-region",
      repo_info: "#repo-info"
    },

    onRender: function() {

      $('#toolbar-frame').show();
      $('#right-panel').show();

      userVoice.install(this.$el.find('#help-button'), context.getUser());

      // reference collections
      var userCollection = itemCollections.users;

      // File View
      // this.files.show(new FileView({ collection: fileCollection }));

      if (!context.inOneToOneTroupeContext()) {
        this.troupeAvatar.show(new TroupeAvatar({
          troupe: context.troupe(),
          noHref: true,
          noUnread: true,
          tooltipPlacement: 'left'
        }));
      }

      // People View
      this.people.show(new PeopleCollectionView({ collection: userCollection }));

      // Repo info
      if (context().troupe.githubType === 'REPO') {
        var repo = new repoInfo.model();
        repo.fetch({ data: $.param({repo: context().troupeUri })});
        this.repo_info.show(new repoInfo.view({ model: repo }));
      }
    },

  });
  cocktail.mixin(RightToolbarLayout, TroupeViews.DelayedShowLayoutMixin);

  return RightToolbarLayout;

});
