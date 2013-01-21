define([
  'views/base',
  'hbs!./requestView',
  'hbs!./requestItemView'
], function(TroupeViews, requestViewTemplate, requestItemViewTemplate) {

  var RequestItemView = TroupeViews.Base.extend({
    //tagName: 'span',
    template: requestItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  });

  return TroupeViews.Base.extend({
    template: requestViewTemplate,

    initialize: function(/*options*/) {
      this.collectionView = new Marionette.CollectionView({
        collection: this.collection,
        itemView: RequestItemView
      });

      var self = this;
      function updateVisibility() {
        self.setVisibility(true);
      }

      this.setVisibility(false);
      this.collection.on('add', updateVisibility);
      this.collection.on('remove', updateVisibility);
      this.collection.on('reset', updateVisibility);

      this.addCleanup(function() {
        this.collection.off('add', updateVisibility);
        this.collection.off('remove', updateVisibility);
        this.collection.off('reset', updateVisibility);
      });
    },

    setVisibility: function(animate) {
      if (this.collection.length > 0) {
        return (animate) ? this.$el.slideDown() : this.$el.show();
      }
      else {
        return (animate) ? this.$el.slideUp() : this.$el.hide();
      }
    },

    afterRender: function() {
      this.$el.find('.frame-request').append(this.collectionView.render().el);
    }

  });

});