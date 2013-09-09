/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/fileItemView',
  'views/unread-item-view-mixin',
  'cocktail',
  'bootstrap_tooltip'             // No Ref
], function(TroupeViews, template, UnreadItemViewMixin, cocktail) {
  "use strict";

  var View = TroupeViews.Base.extend({
    unreadItemType: 'file',
    tagName: 'span',
    template: template,
    initialize: function() {
      this.setRerenderOnChange();
    },

    getRenderData: function(){
      var data = this.model.toJSON();

      data.fileIcon = this.model.get('thumbnailUrl');
      data.useSpinner = !this.hasThumb();

      return data;
    },

    render: function() {
      var r = TroupeViews.Base.prototype.render.call(this);

      var firstChild = this.$el.find(':first-child');
      if (window._troupeCompactView !== true) {
        if (firstChild.tooltip) {
          firstChild.tooltip({
            html : true,
            container: "body"
          });
        }
      }

      return r;
    },

    hasThumb: function() {
      var versions = this.model.get('versions');
      return versions.at(versions.length - 1).get('thumbnailStatus') !== 'GENERATING';
    }

  });
  cocktail.mixin(View, UnreadItemViewMixin);

  return View;
});
