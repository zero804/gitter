
define([
  'jquery-hammer',
  'marionette',
  'hbs!./tmpl/home-org-view',
  'hbs!./tmpl/homeOrgListItem',
  'utils/appevents',
  'utils/is-mobile'
], function($hammer, Marionette, orgTemplate, orgListItemTemplate, appEvents, isMobile) {
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

  return Marionette.CompositeView.extend({
    collectionEvents: {
      'add remove reset sync': 'onRender'
    },
    ui: {
      header: '#org-list-header'
    },
    itemViewContainer: "#org-list-items",
    // tagName: 'ul',
    // className: 'suggested-room-list',
    template: orgTemplate,
    itemView: OrgItemView,
    onRender: function() {
      if(this.collection.length > 0) {
        this.ui.header.show();
      } else {
        this.ui.header.hide();
      }

    }
  });

});
