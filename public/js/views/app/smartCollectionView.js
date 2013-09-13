/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'views/base',
  'cocktail',
  'views/widgets/troupeAvatar'
], function(Marionette, TroupeViews, cocktail, TroupeAvatarWidget) {
  "use strict";

  var Collection = Marionette.CollectionView.extend({
    tagName: 'div',
    itemView: TroupeAvatarWidget,
    initialize: function() {
      this.listenTo(this.collection, 'sort', this.resort);
    },
    resort: function() {
      var self = this;
      var children = this.children;
      var el = self.el;

      self.collection.forEach(function(model) {
        var av = children.findByModel(model);
        el.appendChild(av.el);
      });
    }
  });

  cocktail.mixin(Collection, TroupeViews.SortableMarionetteView);

  return Collection;

});