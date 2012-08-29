// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./userTabView',
  'collections/users',
  './userItemView'
], function($, _, Backbone, TroupeViews, template, userModels, UserItemView) {
  return TroupeViews.Base.extend({
    template: template,

    events: {
      //"click .clickPoint-showEmail": "onHeaderClick"
    },

    attributes: {
      //'class': 'trpMailRowContainer'
    },

    initialize: function(options) {
      var self = this;
      this.collection = new userModels.UserCollection();

      this.collection.listen();
      this.collection.fetch();

      this.addCleanup(function() {
        self.collection.unlisten();
      });

    },

    afterRender: function() {
      this.itemView = new TroupeViews.Collection({
          itemView: UserItemView,
          itemViewOptions: { displayMode: 'user' },
          collection: this.collection,
          el: this.$el.find(".frame-users")});
    }

  });
});
