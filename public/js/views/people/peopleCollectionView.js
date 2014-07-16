define([
  'marionette',
  'backbone',
  'views/base',
  'hbs!./tmpl/peopleItemView',
  'hbs!./tmpl/peopleCollectionView',
  'hbs!./tmpl/remainingView'
], function(Marionette, Backbone, TroupeViews, peopleItemViewTemplate, peopleCollectionViewTemplate, remainingViewTempate) {
  "use strict";

  var PeopleItemView = TroupeViews.Base.extend({
    tagName: 'li',
    template: peopleItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  });

  var PeopleCollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'roster',
    itemView: PeopleItemView,
    initialize: function() {
      this.listenTo(this.collection, 'sort reset', this.render);
    }
  });

  var RemainingView = Backbone.View.extend({
    tagName: 'p',
    className: 'remaining',
    template: remainingViewTempate,
    initialize: function(options) {
      this.roster = options.roster;
      this.users = options.users;
      this.listenTo(this.roster, 'add remove reset', this.render);
      this.listenTo(this.users, 'add remove reset', this.render);
    },
    render: function() {
      var remainingCount = this.users.length - this.roster.length;
      this.$el.html(this.template({
        remainingCount: remainingCount,
        plural: remainingCount > 1
      }));
      this.$el.toggleClass('showFull', remainingCount > 0);
      this.$el.toggleClass('showMid', this.roster.length > 10);
      return this;
    }
  });

  var ExpandableRosterView = TroupeViews.Base.extend({
    template: peopleCollectionViewTemplate,

    initialize: function(options) {
      this.rosterView = new PeopleCollectionView({
        collection: options.rosterCollection
      });
      this.remainingView = new RemainingView({
        roster: options.rosterCollection,
        users: options.userCollection
      });
    },

    afterRender: function() {
      this.$el.find('.frame-people')
        .append(this.rosterView.render().el)
        .append(this.remainingView.render().el);
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

});
