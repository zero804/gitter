"use strict";
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var ModalView = require('views/modal');
var AvatarView = require('views/widgets/avatar');
var collectionTemplate = require('./tmpl/peopleCollectionView.hbs');
var remainingTempate = require('./tmpl/remainingView.hbs');
require('views/behaviors/isomorphic');

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

    behaviors: {
      Isomorphic: {
        rosterRegion: { el: "#roster-region", init: 'initRosterRegion' },
        remainingRegion: { el: "#remaining-region", init: 'initRemainingRegion' }
      }
    },

    initRosterRegion: function(optionsForRegion) {
      return new PeopleCollectionView(optionsForRegion({ collection: this.options.rosterCollection }));
    },

    initRemainingRegion: function(optionsForRegion) {
      return new RemainingView(optionsForRegion({ model: context.troupe() }));
    },

  });

  var AllUsersModal = ModalView.extend({
    initialize: function(options) {
      options = options || {};
      options.title = "People";
      ModalView.prototype.initialize.call(this, options);
      this.view = new PeopleCollectionView(options);
    }
  });
  return {
    ExpandableRosterView: ExpandableRosterView,
    Modal: AllUsersModal
  };


})();
