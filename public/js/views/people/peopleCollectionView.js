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
      this.listenTo(this.rosterCollection, 'add remove reset', this.render);
    },

    serializeData: function() {
      var userCount = context.troupe().get('userCount');
      var data = {
        showAddBadge: context.isLoggedIn() && !context.inOneToOneTroupeContext(),
        userCount: userCount,
        plural: userCount > 1
      };

      return data;
    },

    onRender: function() {
      //var userCount = context.troupe().get('userCount');
      //this.ui.showMore.hide();
      //this.$el.toggleClass('showMid', this.rosterCollection.length > 10);

      //if (userCount > 25) {
      //  this.ui.showMore.show();
      //  this.$el.toggleClass('showFull');
      //}
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
      this.listenTo(this.rosterCollection, 'all', this.render);
    },

    onRender: function() {
      this.roster.show(new PeopleCollectionView({
        collection: this.rosterCollection
      }));

      this.remaining.show(new RemainingView({
        rosterCollection: this.rosterCollection,
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

