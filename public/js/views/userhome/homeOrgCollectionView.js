
define([
  'jquery-hammer',
  'marionette',
  'hbs!./tmpl/homeOrgListItem',
  'utils/appevents',
  'utils/is-mobile'
], function($hammer, Marionette, orgListItemTemplate, appEvents, isMobile) {
  "use strict";

  var OrgItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: orgListItemTemplate,
    modelEvents: {
      change: 'render'
    },
    initialize: function() {
      this.$el = $hammer(this.$el).hammer();
    },
    serializeData: function() {
      return this.model.toJSON();
    },
    events: function() {
      return isMobile() ? { tap: 'navigate' } : { click: 'navigate' };
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
    itemView: OrgItemView
  });

});
