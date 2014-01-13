/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'backbone',
  'views/base',
  'hbs!./tmpl/peopleItemView',
  'hbs!./tmpl/peopleCollectionView'
], function(Marionette, backbone, TroupeViews, peopleItemViewTemplate, peopleCollectionViewTemplate) {
  "use strict";

  var PeopleItemView = TroupeViews.Base.extend({
    tagName: 'span',
    template: peopleItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  });

  var RemainingView = backbone.View.extend({
    initialize: function(options) {
      this.roster = options.roster;
      this.users = options.users;
      this.listenTo(this.roster, 'add remove', this.render);
      this.listenTo(this.users, 'add remove', this.render);
    },
    render: function() {
      var remainingCount = this.users.length - this.roster.length;
      this.$el.html('and '+remainingCount+' more');
      return this;
    }
  });

  return TroupeViews.Base.extend({
    template: peopleCollectionViewTemplate,

    initialize: function(options) {
      this.rosterView = new Marionette.CollectionView({
        tagName: "span",
        collection: options.rosterCollection,
        itemView: PeopleItemView
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

});
