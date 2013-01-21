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
      var self= this;
      this.collection.on('reset', function() {
        console.dir(self.collection);
        window.alert(self.collection.length + " items returned in collection ");
      });
    },

    afterRender: function() {
      this.$el.find('.frame-request').append(this.collectionView.render().el);
    }

  });

});