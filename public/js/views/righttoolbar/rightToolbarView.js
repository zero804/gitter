define([
  'jquery',
  'marionette',
  'utils/context',
  'collections/instances/integrated-items',
  'collections/chat-search',
  'views/people/peopleCollectionView',
  'views/chat/chatCollectionView',
  'views/search/searchView',
  './repoInfo',
  './activity',
  'utils/scrollbar-detect'
], function($, Marionette, context, itemCollections, chatSearchModels, PeopleCollectionView, chatCollectionView, SearchView, repoInfo, ActivityStream, hasScrollBars) {
  "use strict";

  var RightToolbarLayout = Marionette.Layout.extend({

    regions: {
      search: '#search-panel',
      people: "#people-roster",
      repo_info: "#repo-info",
      activity: "#activity"
    },

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
      'click .activity-expand' : 'expandActivity',
      'click #people-header' : 'showPeopleList',
      'click #info-header' : 'showRepoInfo',
      'submit #upload-form': 'upload'
    },

    toggleSearch: function () {
      // hide all regions and show/hide search...

    },

    initialize: function() {

      // People View
      this.people.show(new PeopleCollectionView.ExpandableRosterView({
        rosterCollection: itemCollections.roster,
        userCollection: itemCollections.sortedUsers
      }));

      // Repo info
      if (context.troupe().get('githubType') === 'REPO') {
        var repo = new repoInfo.model();
        repo.fetch({ data: $.param({repo: context.troupe().get('uri') })});
        this.repo_info.show(new repoInfo.view({ model: repo }));
      }

      // Activity
      this.activity.show(new ActivityStream({ collection: itemCollections.events }));

      var chatSearchCollection = new chatSearchModels.ChatSearchCollection([], { });

      this.search.show(new SearchView({
        className: 'search',
        collection: chatSearchCollection,
        chatCollection: itemCollections.chats,
        chatView: chatCollectionView
      }));

      // this.searchView = .render();

      itemCollections.events.on('add reset sync', function() {

        if (itemCollections.events.length >0) {
          this.$el.find('#activity-header').show();
          itemCollections.events.off('add reset sync', null, this);
        } else {
          if (context().permissions.admin) {
            this.$el.find('#activity-header').show();
          }

        }
      }, this);
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

    onShow: function() {
       if (hasScrollBars()) {
        $(".trpToolbarContent").addClass("scroller");
      }
    },

    expandActivity: function() {
      $('.activity-expand .commits').slideToggle();
    }

  });

  return RightToolbarLayout;

});
