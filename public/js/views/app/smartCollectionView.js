/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  'views/base',
  'cocktail',
  'views/widgets/troupeAvatar'
], function($, Marionette, TroupeViews, cocktail, TroupeAvatarWidget) {
  "use strict";

  var Collection = Marionette.CollectionView.extend({
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
    resort: function(collection, options) {
      var self = this;
      var children = this.children;

      self.collection.forEach(function(model, index) {
        var av = children.findByModel(model);
        av.el.id = 'i' + model._sortIndex;
        //el.appendChild(av.el);
      });
    },
    onAfterItemAdded: function(itemView) {
      var model = itemView.model;
      var i = model._sortIndex;
      itemView.el.id = 'i' + i;
    },
    resortOriginal: function(collection, options) {
      if(options.single) {
        return this.resortSingle(options);
      }
      var self = this;
      var children = this.children;
      var el = self.el;

      self.collection.forEach(function(model) {
        var av = children.findByModel(model);
        el.appendChild(av.el);
      });
    },
    resortSingle: function(options) {
      var to = options.to;

      var model = this.collection.at(to);

      var element = this.children.findByModel(model).el;

      if(to === this.collection.length - 1) {
        this.el.appendChild(element);
      } else {
        var nextModel = this.collection.at(to + 1);
        var nextElement = this.children.findByModel(nextModel).el;

        this.el.insertBefore(element, nextElement);
      }
    }
  });

  cocktail.mixin(Collection, TroupeViews.SortableMarionetteView);

  return Collection;

});