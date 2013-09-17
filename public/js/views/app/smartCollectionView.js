/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  'views/base',
  'cocktail',
  'views/widgets/troupeAvatar',
  'views/widgets/inviteAvatar'
], function($, Marionette, TroupeViews, cocktail, TroupeAvatarWidget, InviteAvatar) {
  "use strict";

  var CollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',
    itemView: TroupeAvatarWidget,
    itemViewOptions: { tagName: 'li' },
    initialize: function() {
      this.listenTo(this.collection, 'sort', this.resort);

      // Workaround for Webkit bug: force scroll height to be recomputed after the transition ends, not only when it starts
      $(".trpSmartBarItems").on("webkitTransitionEnd", function () {
          $(this).hide().offset();
          $(this).show();
      });

    },

    // Build an `itemView` for every model in the collection.
    buildItemView: function(item, ItemViewType, itemViewOptions){
      if(item.constructor.modelType === 'invite') {
        ItemViewType = InviteAvatar;
      }

      return CollectionView.__super__.buildItemView.call(this, item, ItemViewType, itemViewOptions);
    },

    resort: function(collection) {
      var children = this.children;

      collection.forEach(function(model) {
        var av = children.findByModel(model);
        av.el.id = 'i' + model._sortIndex;
      });
    },

    onAfterItemAdded: function(itemView) {
      var model = itemView.model;
      var i = model._sortIndex;
      itemView.el.id = 'i' + i;
    }
  });

  cocktail.mixin(CollectionView, TroupeViews.SortableMarionetteView);

  return CollectionView;

});