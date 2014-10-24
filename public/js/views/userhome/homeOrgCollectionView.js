
define([
  'marionette',
  'hbs!./tmpl/home-org-view',
  'hbs!./tmpl/homeOrgListItem',
  'utils/appevents'
], function(Marionette, orgTemplate, orgListItemTemplate, appEvents) {
  "use strict";

  var OrgItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: orgListItemTemplate,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      return this.model.toJSON();
    },
    events: {
      click: 'navigate'
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
