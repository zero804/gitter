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
  './repoInfo',
  './activity',
  'utils/scrollbar-detect'
], function($, Backbone, Marionette, TroupeViews, context, /*qq,*/ rightToolbarTemplate, itemCollections,
  PeopleCollectionView, cocktail, userVoice, TroupeAvatar, repoInfo, activityStream, hasScrollBars) {
  "use strict";

  var RightToolbarLayout = Marionette.Layout.extend({
    tagName: "span",
    template: rightToolbarTemplate,

    regions: {
      people: "#people-roster",
      troupeAvatar: "#troupe-avatar-region",
      repo_info: "#repo-info",
      activity: "#activity"
    },

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
      'click .activity-expand' : 'expandActivity',
      'click #people-header' : 'showPeopleList',
      'click #info-header' : 'showRepoInfo'
    },

    showPeopleList: function() {
      $('#repo-info').hide();
      $('#people-roster').show();

      $('#people-header').addClass('selected');
      $('#info-header').removeClass('selected');
    },

    showRepoInfo: function() {
      $('#people-roster').hide();
      $('#repo-info').show();
      $('#people-header').removeClass('selected');
      $('#info-header').addClass('selected');
    },

    serializeData: function() {
      var isRepo;
      if (context().troupe.githubType === 'REPO') {
        isRepo = true;
      }
      return {
        isRepo : isRepo
      }
    },

    onShow: function() {
       if (hasScrollBars()) {
        $(".trpChatContainer").addClass("scroller");
        $(".trpChatInputArea").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }
    },

    expandActivity: function() {
      $('.activity-expand .commits').slideToggle();
    },

    onRender: function() {
      $('#toolbar-frame').show();

      userVoice.install(this.$el.find('#help-button'), context.getUser());

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
      this.people.show(new PeopleCollectionView.ExpandableRosterView({
        rosterCollection: itemCollections.roster,
        userCollection: itemCollections.sortedUsers
      }));

      // Repo info
      if (context().troupe.githubType === 'REPO') {
        var repo = new repoInfo.model();
        repo.fetch({ data: $.param({repo: context().troupeUri })});
        this.repo_info.show(new repoInfo.view({ model: repo }));
      }

      // Activity
      this.activity.show(new activityStream({collection: itemCollections.events}));
    },

  });
  cocktail.mixin(RightToolbarLayout, TroupeViews.DelayedShowLayoutMixin);

  return RightToolbarLayout;

});
