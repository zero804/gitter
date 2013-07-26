/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'hbs!./tmpl/invitesItemTemplate'
], function(Marionette, itemTemplate) {
  "use strict";

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    initialize: function(options) {
      this.itemViewOptions = { fromViewer: options.fromViewer };
    },
    itemView: Marionette.ItemView.extend({
      tagName: 'li',
      template: itemTemplate,
      serializeData: function() {
        if (this.options.fromViewer) {
          return {
            url: this.model.get('user').url,
            name: this.model.get('user').displayName
          };
        }
        else {
          return {
            url: this.model.get('acceptUrl'),
            name: this.model.get('name')
          };
        }
      }
    })
  });
});