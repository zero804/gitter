/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'views/widgets/troupeAvatar'
], function(Marionette, TroupeAvatarWidget) {
  "use strict";

  return Marionette.CollectionView.extend({
    tagName: 'div',
    itemView: TroupeAvatarWidget
  });
});