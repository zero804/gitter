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
    itemView: TroupeAvatarWidget
  });

  cocktail.mixin(Collection, TroupeViews.SortableMarionetteView);

  return Collection;

});