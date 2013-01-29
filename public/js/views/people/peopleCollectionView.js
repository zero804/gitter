/*jshint unused:true browser:true*/
define([
  'marionette',
  'views/base',
  'hbs!./tmpl/peopleItemView',
  'hbs!./tmpl/peopleCollectionView'
], function(Marionette, TroupeViews, peopleItemViewTemplate, peopleCollectionViewTemplate) {
  "use strict";

  var PeopleItemView = TroupeViews.Base.extend({
    //tagName: 'span',
    template: peopleItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  });

  return TroupeViews.Base.extend({
    template: peopleCollectionViewTemplate,

    initialize: function(/*options*/) {
      this.collectionView = new Marionette.CollectionView({
        tagName: "span",
        collection: this.collection,
        itemView: PeopleItemView
      });
    },

    afterRender: function() {
      this.$el.find('.frame-people').append(this.collectionView.render().el);
    }

  });

});
