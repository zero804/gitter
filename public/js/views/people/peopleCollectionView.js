"use strict";
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var TroupeViews = require('views/base');
var AvatarView = require('views/widgets/avatar');
var collectionTemplate = require('./tmpl/peopleCollectionView.hbs');
var remainingTempate = require('./tmpl/remainingView.hbs');

module.exports = (function() {
  var PeopleCollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',

    className: 'roster',

    childView: AvatarView,

    childViewOptions: function(item) {
      var options = {
        tagName: 'li',
        showStatus: true,
        tooltipPlacement: 'left'
      };

      if(item && item.id) {
        var prerenderedUserEl = this.$el.find('.js-model-id-' + item.id)[0];
        if (prerenderedUserEl) {
          options.el = prerenderedUserEl;
        }
      }

      return options;
    }
  });

  var RemainingView = Marionette.ItemView.extend({
    className: 'remaining',

    template: remainingTempate,

    modelEvents: {
      'change:userCount': 'render'
    },

    serializeData: function() {
      var userCount = this.model.get('userCount');
      var data = {
        showAddBadge: context.isLoggedIn() && !context.inOneToOneTroupeContext(),
        userCount: userCount,
        hasHiddenMembers: userCount > 25
      };

      return data;
      }
  });

  var ExpandableRosterView = Marionette.LayoutView.extend({
    template: collectionTemplate,

    regions: {
      rosterRegion: "#roster-region",
      remainingRegion: "#remaining-region"
    },

    initialize: function(options) {
      var prerenderedRosterEl = this.$el.find('#roster-view')[0];
      var rosterView = new PeopleCollectionView({
        el: prerenderedRosterEl,
        collection: options.rosterCollection
      });

      var prerenderedRemainingEl = this.$el.find('#remaining-view')[0];
      var remainingView = new RemainingView({
        el: prerenderedRemainingEl,
        model: context.troupe()
      });

      // attach without emptying existing regions
      this.rosterRegion.attachView(rosterView);
      this.remainingRegion.attachView(remainingView);
    }
  });

  var AllUsersModal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = "People";
      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new PeopleCollectionView(options);
    }
  });

  return {
    ExpandableRosterView: ExpandableRosterView,
    Modal: AllUsersModal
  };


})();
