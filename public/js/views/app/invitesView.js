/*jshint unused:strict, browser:true */
define([
  'marionette',
  'hbs!./tmpl/invitesItemTemplate'
], function(Marionette, itemTemplate) {
  "use strict";

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: Marionette.ItemView.extend({
      tagName: 'li',
      template: itemTemplate
    })
  });
});