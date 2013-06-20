/*jshint unused:true, browser:true */
define([
  'marionette',
  'hbs!./tmpl/invitesItemTemplate'
], function(Marionette, itemTemplate) {

  return Marionette.CollectionView.extend({
      itemView: Marionette.ItemView.extend({
        tagName: 'li',
        template: itemTemplate
      })
    });
});