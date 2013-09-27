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

      var $e = this.$el;

      this.listenToOnce(this.collection, 'add sort reset', function() {
        window.setTimeout(function() {
          $e.addClass('animated');
        }, 1000);
      });

      this.onResize = this.onResize.bind(this);
      $(window).resize(this.onResize);
      this.onResize();
    },

    onResize: function() {
      var t = $('.trpMiniActions').offset().top - 15;
      var space = Math.floor(t/50);
      if(space > 22) space = 22;
      if(space < 0) space = 0;
      this.collection.setLimit(space);
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
        if(!av) return; // Why?
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