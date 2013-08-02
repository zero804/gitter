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
        var toUser = this.model.get('user');

        if (this.options.fromViewer) {
          return {
            url: '#|reinvite/' + this.model.get('id'),
            name: (toUser) ? toUser.displayName : this.model.get('email')
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