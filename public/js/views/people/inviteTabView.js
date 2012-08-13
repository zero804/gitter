// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./inviteTabView',
  'collections/invites',
  './userItemView'
], function($, _, Backbone, TroupeViews, template, inviteModels, UserItemView) {
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
      this.collection = new inviteModels.RequestCollection();

      this.collection.listen();
      this.collection.fetch();

      this.addCleanup(function() {
        self.collection.unlisten();
      });

    },

    afterRender: function() {
      this.itemView = new TroupeViews.Collection({
          itemView: UserItemView,
          itemViewOptions: { displayMode: 'invite' },
          collection: this.collection,
          el: this.$el.find(".frame-invites")});
    }

  });
});
