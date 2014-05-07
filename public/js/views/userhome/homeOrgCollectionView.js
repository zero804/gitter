/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery-hammer',
  'marionette',
  'views/base',
  'hbs!./tmpl/homeOrgListItem',
  'utils/appevents'
], function($hammer, Marionette, TroupeViews, orgListItemTemplate, appEvents) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: orgListItemTemplate,
    initialize: function() {
      this.$el = $hammer(this.$el).hammer();
      this.setRerenderOnChange(true);
    },
    getRenderData: function() {
      return this.model.toJSON();
    },
    events: function() {
      if('ontouchstart' in document.documentElement) {
        return { tap: 'navigate' };
      } else {
        return { click: 'navigate' };
      }
    },
    navigate: function() {
      var name = this.model.get('name');
      var url = '/' + name;
      appEvents.trigger('navigation', url, 'chat', name);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'suggested-room-list',
    itemView: TroupeItemView
  });

});
