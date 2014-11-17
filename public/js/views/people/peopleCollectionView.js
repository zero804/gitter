"use strict";
var Marionette = require('marionette');
var context = require('utils/context');
var TroupeViews = require('views/base');
var AvatarView = require('views/widgets/avatar');
var collectionTemplate = require('./tmpl/peopleCollectionView.hbs');
var remainingTempate = require('./tmpl/remainingView.hbs');

module.exports = (function() {


  var PeopleCollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'roster',
    itemView: AvatarView,
    itemViewOptions: function() {
      return { tagName: 'li', showStatus: true, tooltipPlacement: 'left' };
    },
    initialize: function() {
      this.listenTo(this.collection, 'sort reset', this.render);
    }
  });

  var RemainingView = Marionette.ItemView.extend({

    ui: {
      showMore: '.js-show-more',
      addMore: '.js-add-more'
    },

    className: 'remaining',

    template: remainingTempate,

    initialize: function(options) {
      this.rosterCollection = options.rosterCollection;
      this.userCollection = options.userCollection;
      this.listenTo(this.rosterCollection, 'add remove reset', this.render);
      this.listenTo(this.userCollection, 'add remove reset', this.render);
    },

    serializeData: function() {
      var remainingCount = this.userCollection.length - this.rosterCollection.length;
      return {
        showAddBadge: context.isLoggedIn() && !context.inOneToOneTroupeContext(),
        remainingCount: remainingCount,
        plural: remainingCount > 1
      };
    },

    onRender: function() {
      var remainingCount = this.userCollection.length - this.rosterCollection.length;
      this.ui.showMore.hide();
      this.$el.toggleClass('showMid', this.rosterCollection.length > 10);

      if (remainingCount > 0) {
        this.ui.showMore.show();
        this.$el.toggleClass('showFull');
      }
    }
  });

  var ExpandableRosterView = Marionette.Layout.extend({
    template: collectionTemplate,

    regions: {
      roster: "#roster",
      remaining: "#remaining"
    },

    initialize: function(options) {
      this.rosterCollection = options.rosterCollection;
      // console.debug('this.rosterCollection:', this.rosterCollection);
      this.userCollection = options.userCollection;
    },

    onRender: function() {
      this.roster.show(new PeopleCollectionView({
        collection: this.rosterCollection
      }));

      this.remaining.show(new RemainingView({
        rosterCollection: this.rosterCollection,
        userCollection: this.userCollection
      }));
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

